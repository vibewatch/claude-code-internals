# Slash commands and automation

This page documents slash-command and automation surfaces that complement the agent/task runtime.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| PluginSlashCommandSchema | `slash command name` | Plugin schema surface for command files becoming slash commands. |
| SkillSlashDispatch | `via Skill tool or slash command` | Skill dispatch can be triggered by slash commands. |
| SkillShellExecutionPolicy | `Disable inline shell execution in skills and custom slash commands` | Policy boundary for slash-command shell execution. |
| SkillShellPlaceholder | `[shell command execution disabled by policy]` | Literal replacement inserted for eligible fenced or inline shell forms when execution is disabled. |
| ModelInvocationBoundary | `disableModelInvocation` | Excludes a skill from model/`Skill` invocation while preserving direct user invocation when otherwise enabled. |
| UnknownCommandResult | `Unknown command: /...`, `Did you mean /...?` | Recognized unknown command names return locally without a model request. |
| SlashCommandKeybindings | `command:help`, `command:compact` | Keybinding action can execute slash commands. |
| PermissionsSlashCommandHint | `/permissions to manage` | Runtime UX string pointing to permission slash command. |
| DoctorSlashDiagnosticSurface | `/doctor diagnostics screen` | Slash/UI diagnostic surface. |
| AutoModeCommand | `H.command("auto-mode")` | Automation/classifier inspection command. |
| AutoModeConsentDebug | `[auto-mode] hasAutoModeOptIn=` | Auto-mode consent/config debug string. |
| ConfigKeyValueCommand | `Usage: /config key=value [key=value ...]` | Applies settings without opening the full settings UI. |
| ChangeDirectoryCommand | `Usage: /cd <path>` | Moves the live session to another working directory. |
| ForkCommand | `Usage: /fork \<directive\>` | Starts a conversation copy as a background session. |
| SubtaskCommand | `Usage: /subtask \<task\>` | Starts an in-session delegated subagent. |
| WorkflowsCommand | `/workflows` | Opens dynamic workflow progress/history and stop controls. |
| TeamOnboardingCommand | `name: "team-onboarding"`, `disableModelInvocation: true` | User-only workflow that analyzes recent local usage and drafts `ONBOARDING.md`. |
| TeamOnboardingShare | `ShareOnboardingGuide`, `allow_team_onboarding` | Optional organization-hosted share/update/delete layer for the generated guide. |

## Automation surfaces

| Surface | Runtime role |
|---|---|
| Slash command files | Plugin/schema strings state command name becomes slash command name, e.g. `about` → `/plugin:about`. |
| Skill dispatch | Skills can be dispatched through the `Skill` tool or slash command. |
| Inline shell policy | Managed policy can disable inline shell execution in skills/custom slash commands. |
| Keybindings | Keybinding actions can execute command names such as `command:help` and `command:compact`. |
| Permission UX | `/permissions` manages working-directory/tool permission state. |
| Doctor UX | `/doctor` is a diagnostic screen in the interactive UI. |
| `auto-mode` | Command for inspecting classifier defaults/config and critiquing custom rules. |
| `/config key=value` | Sets one or more settings directly; bare `/config` opens the interactive settings screen. |
| `/cd <path>` | Changes the session cwd and triggers associated root/MCP/hook updates. |
| `/fork <directive>` | Creates a separately managed background copy of the conversation. |
| `/subtask <task>` | Delegates one task inside the current session. |
| `/workflows` | Shows live and historical deterministic workflow runs. |
| `/team-onboarding` | Scans bounded recent local session usage, drafts `ONBOARDING.md`, collects team review input, and optionally preserves one hosted share link across the draft/final update. |

## Slash-command path

```mermaid
flowchart TD
    Plugin[Plugin command metadata/files] --> Slash[Slash command]
    Skill[Skill metadata] --> Slash
    Keybinding[Keybinding action] --> Slash
    Slash --> Runtime[Interactive session runtime]
    Runtime --> Tools[Tool/permission paths]
    Policy[disableSkillShellExecution] --> Slash
```

## Execution boundaries

Managed `disableSkillShellExecution` does not reject the whole skill. For eligible user/project/plugin skill and legacy-command content, the runtime replaces `` ```! ... ``` `` fenced blocks and inline `` !`...` `` forms with the literal `[shell command execution disabled by policy]`; it does not run those commands or substitute their output. Policy-sourced skills are trusted separately and bypass this replacement branch, remaining on the normal permission-checked local shell-expansion path. MCP-served prompts neither execute local shell expansion nor receive the placeholder replacement.

`disableModelInvocation` is a caller boundary, not a synonym for “disabled command.” It keeps the command out of model-visible Skill invocation and prevents workers/coordinators from invoking it through that path, while an otherwise enabled, user-invocable command can still run when the user types its slash command directly in the ordinary command path. Conversely, `user-invocable: false` blocks direct user execution and tells the user to ask Claude to use the skill.

If a slash-shaped first token is syntactically command-like but resolves to no enabled command, dispatch returns `Unknown command: /name` locally with an edit-distance suggestion when available and sets `shouldQuery: false`; the model is not invoked. Inputs that fail command parsing in non-interactive mode, or slash-prefixed text that does not meet the command-like branch, can instead fall back to ordinary prompt handling.

## Auto-mode

`auto-mode` is registered as a top-level command when the feature is not disabled. It exposes `config`, `defaults`, `critique`, and `reset`; reset removes the user-level `autoMode` section after confirmation (`--yes` skips the prompt). Classifier rules can only come from user, flag/SDK, or managed settings—project/local rules are ignored because repositories control those files.

## `/team-onboarding`

`/team-onboarding` is a built-in skill-shaped command but cannot be invoked by the model. This is a meaningful privacy boundary: the user explicitly starts the workflow before Claude Code scans recent local JSONL sessions for command/MCP counts, bounded session descriptors, and repository metadata.

The workflow writes a local `ONBOARDING.md` first. When first-party OAuth, nonessential traffic, organization policy, and rollout gates permit, it can call `ShareOnboardingGuide` once for the draft and again with the same `short_code` after user review. Sharing failure leaves the local guide intact and falls back to manual distribution.

The complete scan limits, guide contract, API modes, and fallback statuses are documented in [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md).

## Subcommand tokenization (`matchSubcommand`)

Slash commands that take an inline subcommand (Skills, `/loop`, `/dream`, `/schedule`, ...) share a single tokenizer at [cli.renamed.js line 718837](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L718837):

```js
function matchSubcommand(H) {
  let $ = H.trim().toLowerCase().split(/\s+/)[0] ?? "";
  return jKA.find((q) => q === $) ?? "none";
}
```

The matcher is deliberately strict: only the first whitespace-separated token after the command name is inspected, the comparison is case-insensitive, and anything not in the registered list collapses to `"none"`. The accepted list is owned by each skill / command — e.g. the Claude API skill ships `jKA = ["migrate", "managed-agents-onboard"]`, so `"/claude-api migrate help me port to 4.7"` resolves to `migrate` and everything after the first token becomes the free-form argument string. The result is reported as both a telemetry dimension (`tengu_claude_api_skill_loaded` carries `subcommand` and `has_args`) and a prompt-template selector.

This pattern explains why the same skill can answer different shapes of question with different prompt blocks: the runtime never tries to parse flags or sub-flags inside the slash command — the registered subcommand is just a small finite set that picks a prompt branch, and the rest of the user input is appended verbatim under `## User Request`. That keeps the parser tiny and predictable while still letting skills declare multi-mode behavior without growing a real argument parser.

## Related docs

- [Agents, tasks, and subagents](agents-tasks-and-subagents.md)
- [Agent runtime, scheduling, and completion](agent-runtime-scheduling-and-completion.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
- [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md)
- [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md)
