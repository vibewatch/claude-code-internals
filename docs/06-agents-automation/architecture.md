# Agent and automation architecture

This page is the architecture analysis for the agents/automation module. It complements the implementation pages by focusing on **how custom agents, subagents, tasks, slash commands, `auto-mode`, and hosted review compose without owning a different runtime** rather than re-listing each constant.

Scope: custom agents from `--agents`, background agents (`claude agents`), task tools (`TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`), task scheduling/completion, subagent lifecycle hooks, slash-command automation, `auto-mode`, `ultrareview` hosted review, and cron/timed tasks. Implementation specifics live in [Agents, tasks, and subagents](agents-tasks-and-subagents.md), [Agent runtime, scheduling, and completion](agent-runtime-scheduling-and-completion.md), and [Slash commands and automation](slash-commands-and-automation.md).

## Module purpose

This module owns **delegation and scheduled automation around the main session**. It does not own model turns or tool execution; it composes them by:

1. Letting users define agents (inline JSON or `claude agents`).
2. Letting the model delegate work via task tools.
3. Letting plugins/keybindings/skills trigger slash-command automation.
4. Letting `auto-mode` classify and consent to common actions.
5. Letting hosted `ultrareview` invoke multi-agent code review.

## Architecture thesis

Agents and automation are **orchestration over the existing runtime**, not parallel runtimes. The same composition root, context loop, tool/permission boundary, and session envelope are reused; this module adds (a) a task store as shared state, (b) lifecycle hooks distinct from tool hooks, (c) a slash-command/keybinding/skill triggering surface, and (d) optional hosted backends.

## Source anchors

| Semantic alias | String or symbol | Architectural meaning |
| --- | --- | --- |
| AgentsCommandFamily | `H.command("agents")` | Background agents command family registered on the root. |
| InlineAgentsFlag | `--agents <json>` | Inline custom-agent injection at session start. |
| TaskCreateTool | `var LX="TaskCreate"` | Task-tool constants used by orchestration. |
| TaskGetTool | `var DQ="TaskGet"` | Task status/result retrieval constant. |
| TaskListTool | `var UZ="TaskList"` | Task listing constant. |
| TaskUpdateTool | `var J0="TaskUpdate"` | Task update constant. |
| SubagentContextClassifier | `agentType==="subagent"` | Runtime classifier distinguishing subagent context. |
| SubagentLifecycleHooks | `SubagentStart`, `SubagentStop` | Subagent lifecycle hook events. |
| TaskLifecycleHooks | `TaskCreated`, `TaskCompleted` | Task lifecycle hook events. |
| TaskNotificationFrame | `task_notification` | Outbound frame carrying long-running task progress. |
| LongRunningMonitorContract | `Each stdout line is delivered to the model as a <task_notification> event; the process runs for the session lifetime.` | Long-running monitor process specification. |
| UltraReviewCommand | `H.command("ultrareview [target]")` | Hosted multi-agent review command. |
| AutoModeCommand | `H.command("auto-mode")` | Auto-mode inspection/critique command. |
| AutoModePolicyConsent | `[auto-mode] hasAutoModeOptIn=true policy defaultMode=auto implies consent` | Auto-mode consent precedence: policy implies opt-in. |
| AutoModeConsentSources | `[auto-mode] hasAutoModeOptIn=...skipAutoPermissionPrompt: user=... local=... flag=... policy=...` | Auto-mode multi-source consent computation. |
| SlashCommandKeybindings | `command:help`, `command:compact` | Keybinding actions that execute slash commands. |
| PluginSlashCommandSchema | `slash command name` | Plugin schema turning command files into slash commands. |
| SkillSlashDispatch | `via Skill tool or slash command` | Skill dispatch can be triggered by slash commands. |
| SkillShellExecutionPolicy | `disableSkillShellExecution` | Policy boundary for slash-command/skill shell execution. |
| PromptSuggestionFrame | `prompt_suggestion` | Predicted-next-prompt frame; relevant to automation/auto-mode UX. |

## Internal decomposition

```mermaid
flowchart TD
    Root[Root composition] --> AgentsCmd[claude agents]
    Root --> AgentsFlag[--agents JSON]
    Root --> Ultra[ultrareview]
    Root --> AutoCmd[auto-mode command]
    Root --> Slash[Slash command registry]

    Session[Active session] --> Tasks[Task store]
    Session --> Hooks[Subagent + task hooks]
    Session --> Slash
    Session --> AutoConsent[Auto-mode consent classifier]

    Tasks --> TaskTools[TaskCreate / TaskGet / TaskList / TaskUpdate]
    TaskTools --> Subagent[Subagent runtime context]
    Subagent --> SubLoop[Context/model loop with agentType=subagent]

    Hooks --> SubStart[SubagentStart / SubagentStop]
    Hooks --> TaskLife[TaskCreated / TaskCompleted]

    Slash --> Plugin[Plugin slash commands]
    Slash --> Skill[Skill dispatch]
    Slash --> Keybind[Keybinding command:*]
    Slash --> Policy[disableSkillShellExecution]

    Ultra --> Preflight[/v1/ultrareview/preflight]
    Ultra --> Hosted[Hosted multi-agent run]

    AutoCmd --> Inspect[defaults/config inspection]
    AutoCmd --> Critique[AI critique of custom rules]
    AutoConsent --> Permission[Permission boundary]
```

| Sub-component | Responsibility |
|---|---|
| Custom agent injection | Parses `--agents` JSON and merges with plugin/marketplace agents. |
| Background agents command | Manages long-running agent jobs; reuses session/MCP/plugin/permission defaults. |
| Task store | Shared state holding task records; addressed by `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`. |
| Subagent runtime context | A session-loop projection where `agentType==="subagent"` changes prompt boundaries and hook routing. |
| Lifecycle hooks | `SubagentStart`/`SubagentStop` for subagents, `TaskCreated`/`TaskCompleted` for task records. |
| Slash command dispatcher | Resolves plugin command files, skill metadata, keybindings into commands. |
| `auto-mode` classifier | Computes consent (user/local/flag/policy) and dispatches to the permission boundary. |
| Hosted review (`ultrareview`) | Sends preflight, then invokes a hosted multi-agent run; mirrors results locally. |
| Task notification monitor | Optional long-running process that emits `<task_notification>` frames per stdout line for the model. |

## Public interface

### Inputs

| Surface | Effect |
|---|---|
| `--agents <json>` | Inline custom agent definitions for the current session. |
| `claude agents ...` (with `--setting-sources`, `--add-dir`, `--plugin-dir`, `--settings`, `--mcp-config`, `--strict-mcp-config`, `--permission-mode`, `--dangerously-skip-permissions`, `--model`) | Background-agent dispatch with session defaults. |
| `ultrareview [target]` | Hosted multi-agent code-review entry. |
| `auto-mode` subcommands | Inspect classifier defaults and critique custom rules. |
| Plugin slash commands (`/plugin:about`, ...) | Plugin-defined commands surfaced through the dispatcher. |
| Skill metadata / `Skill` tool | Skill-based dispatch path. |
| Keybinding actions (`command:help`, `command:compact`) | UI-driven slash command invocation. |
| Managed setting `disableSkillShellExecution` | Trust gate for inline shell in skills/custom slash commands. |
| Managed setting `disableAgentView` | Hides the agent UI surface. |

### Outputs

| Output | Consumer |
|---|---|
| `task_notification` frames | Headless multiplexer / SDK / TUI. |
| `prompt_suggestion` frames | UX; relevant to auto-mode discoverability. |
| Subagent and task hook calls | Hook scripts/commands, telemetry. |
| Hosted review results | Local renderer / preflight metadata. |
| Auto-mode telemetry (`tengu_auto_mode_decision`, `tengu_auto_mode_denial_limit_exceeded`, `tengu_auto_mode_fallback_to_ask`, `tengu_auto_mode_opt_in`) | Telemetry sink. |

## Internal collaborators

| Collaborator | Contract |
|---|---|
| Runtime lifecycle | Registers `agents`, `ultrareview`, `auto-mode`, and slash-command surfaces on the root command. |
| Context/model loop | Runs subagent and task contexts as projections; emits `prompt_suggestion` after each turn. |
| Tool/permission runtime | Receives auto-mode consent decisions; runs task tools through the same boundary as built-ins. |
| Sessions module | Stores agent/task state; resume re-applies custom agents and any task records. |
| MCP/plugins/hooks | Plugins contribute agents, skills, slash commands, and hooks; hosted review may coordinate with MCP. |
| Ops module | Receives auto-mode/task/subagent telemetry; surfaces hosted-review failures via doctor. |
| Remote bridge | Long-running tasks and hosted review interoperate with remote variants via the same envelope. |

## Design decisions

1. **Tasks are constants, not classes.** Task identity is conveyed through string constants (`TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`), so the same task store works for any orchestrator producing those constants.
2. **Subagent is a context flag, not a separate loop.** `agentType==="subagent"` changes prompt boundaries and hook routing within the existing context/model loop; this avoids forking the runtime.
3. **Lifecycle hooks are split.** `SubagentStart/Stop` describe runtime context; `TaskCreated/Completed` describe persistent records. Splitting them lets hook scripts react to either dimension without conflation.
4. **Slash commands are a dispatcher, not a parser.** Slash inputs flow from multiple sources (plugin files, skill metadata, keybindings) into one dispatcher, which routes through the existing runtime; this keeps the model's view stable regardless of trigger.
5. **`auto-mode` is multi-source consent.** Opt-in is computed from policy → user → local → flag, with the policy `defaultMode=auto` implying opt-in. This lets ops set default behavior without per-user changes.
6. **Hosted review is opt-in and explicit.** `ultrareview` exists as its own command; it does not silently activate during normal turns.
7. **Notification monitor is well-scoped.** The long-running process documented at byte `0x112031` runs for the session lifetime and emits one `<task_notification>` per stdout line — a narrow, predictable contract.
8. **Background agents reuse session flags.** `claude agents` accepts the same `--setting-sources`, `--add-dir`, `--plugin-dir`, `--settings`, `--mcp-config`, `--permission-mode`, `--model` so deploys do not invent a parallel configuration surface.
9. **Auto-mode telemetry classifies decisions.** `tengu_auto_mode_decision`, `_denial_limit_exceeded`, `_fallback_to_ask`, `_malformed_tool_input`, `_opt_in` cover the visible state machine so operators can audit behavior.

## Orchestration patterns

| Pattern | When used |
|---|---|
| Inline custom agent (`--agents`) | Lightweight, session-only agent set; common in scripted runs. |
| Background agents | Long-running or repeated work that should outlive a single session command. |
| Subagent via Task tools | Model-driven delegation inside a turn; subagent runs in the same process. |
| Slash command + skill | Human-/keybinding-/plugin-triggered automation that is not model-initiated. |
| Auto-mode | Reduce per-action approval prompts when consent is established; explicit opt-in path. |
| `ultrareview` | Hosted multi-agent code review with preflight checks; opt-in and explicit. |

## Failure modes

| Failure | Behavior |
|---|---|
| `--agents` payload invalid | Startup error before mode dispatch. |
| Task tool input malformed | Boundary rejection with structured error; auto-mode logs `tengu_auto_mode_malformed_tool_input` if applicable. |
| Subagent runs over a turn/budget cap | Result frame uses the same error subtypes as the main loop. |
| Subagent hook deny | The deny path propagates with the standard `PermissionDenied` semantics. |
| Auto-mode hits denial limit | `tengu_auto_mode_denial_limit_exceeded` is emitted; behavior falls back to ask. |
| Hosted review preflight rejection | UX surfaces the reason; no hosted run begins. |
| Slash command resolves to nothing | Dispatcher reports the unknown command without invoking model. |
| Managed policy disables skills' shell execution | Inline shell in skills/custom slash commands becomes a placeholder; no covert escalation. |

## Extension points

| Extension | How it plugs in |
|---|---|
| New agent kind | Provide through `--agents` JSON, plugin schema, or `claude agents` registration; do not invent a parallel session loop. |
| New task field | Extend task store metadata; orchestrators interact through the same `TaskCreate`/`TaskUpdate` constants. |
| New slash command source | Contribute via plugin schema or keybinding action; dispatcher handles routing. |
| Custom auto-mode rule | Use `auto-mode` config plus AI critique path; do not bypass the permission boundary. |
| Custom hosted review backend | Compose at preflight; reuse the local rendering path. |

## Caveats

- The exact task-store data shape is implementation-defined; this page documents responsibilities and interaction surfaces, not record layouts.
- `task_notification` is a system-frame subtype; consumers should treat unknown task-notification fields as forward-compatible.
- `ultrareview` references both local UX (`/ultrareview`, `/review`) and a hosted preflight route; behavior here is bounded by hosted availability and policy.

## Related docs

- [Agents, tasks, and subagents](agents-tasks-and-subagents.md)
- [Agent runtime, scheduling, and completion](agent-runtime-scheduling-and-completion.md)
- [Slash commands and automation](slash-commands-and-automation.md)
- [System architecture](../00-start-here/system-architecture.md)
- [Tool runtime and security architecture](../03-tools-integrations-security/architecture.md)
- [Session and remote-control architecture](../04-sessions-persistence-remote/architecture.md)
- [Operations and native-support architecture](../05-hosted-agent-ops/architecture.md)
