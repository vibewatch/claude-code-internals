# Prompt assembly scenarios

This page reverse-engineers the major Claude Code prompt shapes from the analyzed `cli.renamed.js` bundle. It intentionally uses **scenario skeletons** instead of copying long bundled prompt bodies: the goal is to show which fragments are selected, how they are ordered, and which runtime values fill the gaps.

For exact provider-facing prompt text for one live session, instrument or capture the request after runtime interpolation. The static [Prompt template catalog](prompt-template-catalog.md) keeps hashes, previews, and anchors for this extracted build without retaining generated JSON artifacts.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| DynamicPromptBoundary | `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | Boundary between cache-stable and per-session/per-machine prompt sections. |
| CliPromptMergeHelper | `IgK` | Merges CLI `systemPrompt`, CLI `appendSystemPrompt`, and policy-helper `appendSystemPrompt`. |
| SystemPromptFragmentSelector | `Lb` | Selects override, agent, custom/default, and appended system prompt fragments. |
| WebFetchApplyPrompt | `web_fetch_apply` | Helper model call for applying fetched web content to a user task. |
| WebSearchHelperPrompt | `web_search_tool` | Web-search helper call with a dedicated short system prompt and web-search tool schema. |
| SubagentPromptBuilder | `Cq5` / `jX$` | Subagent prompt construction from `getSystemPrompt()` plus subagent runtime notes. |
| CompactionPromptBuilder | `compact` | Compaction helper call with summarization-oriented system prompt. |
| ApiSystemReminderWrapper | `N2`, `kf5`, `api_system` | Wraps system reminders and creates mid-conversation provider `system` blocks. |
| IssueTitleHelperPrompt | issue-title helper | Small helper model call for GitHub issue title generation. |
| SessionNameHelperPrompt | kebab-case session name helper | Small helper model call that returns a JSON name. |
| SessionSearchPrompt | `session_search` | Agentic transcript search helper with a specialized system prompt. |
| StopConditionEvaluatorPrompt | stop-condition hook evaluator | Hook-condition model call that judges transcript/condition satisfaction. |
| InteractiveAgentBasePrompt | `iB5`, `rB5`, `oB5`, `$p5` | Main interactive-agent base instructions and behavior-rule fragments. |
| DynamicEnvironmentPrompt | `_p5`, `jX$` | Dynamic environment/model/cwd/additional-directory and subagent notes. |
| ProviderRequestAssembler | `QEH`, `NiH`, `iE`, `VDH`, `sp5` | Request assembly, helper-call wrappers, system block cache metadata. |
| MainLoopSystemPromptArray | `lr6`, `KH=H9([...])` | Main loop builds default/custom/appended system prompt array before turns. |
| PromptOverrideFlags | `--system-prompt`, `--append-system-prompt`, files, `--exclude-dynamic-system-prompt-sections` | CLI override/append/dynamic-section controls and file loading. |

## Notation

The scenario sketches below use this notation:

| Notation | Meaning |
|---|---|
| `SYSTEM[n]` | A separate system text block after runtime normalization/cache decoration. |
| `MESSAGE[n]` | A user/assistant/API-system message in the conversation history. |
| `<...>` | Runtime-filled value such as cwd, model, git status, settings, memory, tools, or transcript. |
| `[optional]` | Fragment appears only when the feature or flag is active. |
| `api_system` | Mid-conversation provider `role:"system"` block, if supported by the target path/model. |
| `<system-reminder>` | User-message text wrapper used when a fact should be model-visible without mutating the stable system prefix. |

## Scenario 1: normal interactive coding session

The default interactive session is not one giant literal. The main loop first asks `lr6` for the default system prompt and context, then creates `KH=H9([...default/custom, optional extra, append])` before calling the model path. `QEH`/`KS4` then prepends runtime prefix/attribution sections and decorates cacheable system blocks.

```text
SYSTEM[0] provider/runtime prefix
  - provider compatibility and request framing
  - non-interactive / append-system-prompt attribution flags

SYSTEM[1] main interactive-agent base
  - identity as an interactive software-engineering agent
  - terminal/markdown/tool-output harness rules
  - tool permission mode expectations
  - system-reminder and tool-result trust rules
  - prompt-injection caution for external tool output
  - compaction/context-continuation behavior

SYSTEM[2] coding and safety behavior rules
  - prefer minimal task-scoped changes
  - do not over-engineer or add speculative abstractions
  - preserve user work and avoid risky destructive actions
  - ask/adjust when permission is denied
  - respect output style and language settings

SYSTEM[3] stable tool/capability context
  - built-in tool schemas and descriptions
  - deferred-tool / tool-search hints when enabled
  - MCP, plugin, browser, IDE, and skill capability hints when active

SYSTEM[4] dynamic sections after the boundary
  - model name / model family hints
  - cwd, shell, platform, OS version
  - additional working directories
  - git repository and git status summaries
  - memory paths and loaded instruction files
  - settings-derived mode flags

SYSTEM[5] user/org/project instructions
  - CLAUDE.md / CLAUDE.local.md / .claude/rules
  - managed claudeMd and AutoMem material
  - output style prompt, if one is active

SYSTEM[6] appended material
  - --append-system-prompt or --append-system-prompt-file
  - policy-helper appendSystemPrompt, if present

MESSAGES
  - normalized transcript
  - user prompt and attachments
  - runtime <system-reminder> blocks injected near the relevant turn

TOOLS
  - built-in tools selected for the current mode
  - MCP/plugin/custom tools that survived filtering/defer policy
```

Key evidence: `$p5`, `iB5`, `rB5`, and `oB5` provide the main interactive and behavior-rule fragments; `_p5` contributes environment/model sections; `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` marks the stable/dynamic split; `QEH` prepends request-level prefix/attribution with `ri$(...)` and `ii$(...)` before `sp5(...)` attaches cache metadata.

## Scenario 2: custom `--system-prompt`

When `--system-prompt` or `--system-prompt-file` is supplied, the CLI reads the literal/file into `cli.systemPrompt`, `IgK` returns it, and the main loop uses it instead of the default system prompt body.

```text
SYSTEM[0] provider/runtime prefix
SYSTEM[1] <user supplied --system-prompt text>
SYSTEM[2] [policy/runtime extra for custom prompts, when enabled]
SYSTEM[3] [--append-system-prompt text, if also supplied]

MESSAGES
  - transcript and current user message
  - dynamic reminders may still appear as messages/api_system blocks

TOOLS
  - selected tool schemas still travel separately from the prompt text
```

Important edge cases:

- `--system-prompt` and `--system-prompt-file` are mutually exclusive; the same is true for append prompt vs append prompt file.
- `--exclude-dynamic-system-prompt-sections` is documented as applying only with the default system prompt, so it is ignored when the system prompt is replaced.
- A custom system prompt replaces the default body, but request-level normalization, provider prefixing, tool schemas, and runtime reminders still exist.

## Scenario 3: default prompt plus appended prompt

The append path preserves the default system prompt and appends extra instructions. `IgK` also merges policy-helper append material returned by `GDq()` after the CLI append text.

```text
SYSTEM[0] provider/runtime prefix
SYSTEM[1..N] normal default interactive prompt sections
SYSTEM[N+1] <CLI append prompt>
SYSTEM[N+2] <policy-helper append prompt>

MESSAGES / TOOLS
  - same as the default interactive session
```

This is the safest static mental model for enterprise/managed policy additions: they do not need to rewrite the base prompt; they can be appended late and still be visible to the model.

## Scenario 4: default prompt with dynamic sections excluded

With `--exclude-dynamic-system-prompt-sections`, per-machine sections move out of the system prompt and into the first user message. The stated purpose is cross-user prompt-cache reuse.

```text
SYSTEM
  - stable default system prompt sections
  - stable tool/capability instructions
  - appended prompt, if present

FIRST USER MESSAGE
  <system-reminder or context block>
    - cwd
    - environment info
    - memory paths
    - git status

SUBSEQUENT MESSAGES
  - normal transcript and user turns
```

The source anchor is the root flag description and the dynamic-boundary sentinel. The important design point is that cache-stable identity/rules/tool text can remain cacheable while high-churn local state is carried as message context.

## Scenario 5: `--bare` / minimal mode

Bare mode narrows automatic context discovery. The root help text says it skips hooks, LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, and `CLAUDE.md` auto-discovery; explicit context still works.

```text
SYSTEM
  - explicit --system-prompt or default minimal-compatible system sections
  - explicit --append-system-prompt, if provided
  - explicit --agents / --plugin-dir / --mcp-config surfaces, if provided

OMITTED OR REDUCED
  - automatic CLAUDE.md discovery
  - automatic memory/context prefetch
  - hooks and LSP-driven context
  - plugin sync side effects unless explicitly supplied
```

This scenario is useful when trying to reproduce prompt behavior because it removes many dynamic sources; it does not remove runtime request framing or explicitly configured tools/context.

## Scenario 6: custom or selected main-thread agent

Agent prompt selection is controlled by `Lb`. Its ordering rule is compact enough to reconstruct:

```text
if overrideSystemPrompt exists:
  SYSTEM = [overrideSystemPrompt]
else if agent.getSystemPrompt() exists and agent.appendSystemPrompt is true:
  SYSTEM = [custom/default main prompt, agent prompt, append prompt]
else if agent.getSystemPrompt() exists:
  SYSTEM = [agent prompt, append prompt]
else:
  SYSTEM = [custom/default main prompt, append prompt]
```

The practical consequences are:

- most custom agents with their own prompt replace the default main-session body;
- agents marked `appendSystemPrompt: true` layer their prompt on top of the main-session prompt;
- `--append-system-prompt` remains a late append in either case;
- custom/SDK/plugin agents can add memory-derived text to `getSystemPrompt()` when the relevant memory feature is active.

Related anchors: plugin/custom agent `getSystemPrompt` surfaces around line ~1297 and line ~1623, built-in agent prompts around line ~1355, ~1411, ~1424, ~1473, and ~1609, and CLI-selected agent injection around line ~19358 and ~19536.

## Scenario 7: subagent / fork / teammate prompt

Subagents start from the selected agent definition's `getSystemPrompt()`, then `Cq5`/`jX$` add runtime notes and context such as tool availability, cwd/worktree behavior, and parent/fork context. Forked agents can inherit the parent prompt or an override prompt; worktree isolation can add a worktree reminder.

```text
SYSTEM[0] subagent base prompt
  - agent-specific role/task rules from getSystemPrompt()

SYSTEM[1] subagent runtime notes
  - caller/fork relationship
  - available tools and deferred tools
  - cwd/worktree or isolation notes
  - final-report expectations
  - optional append-subagent prompt

MESSAGES
  - task prompt supplied by the caller
  - optional parent conversation excerpts or fork context
  - tool results local to the subagent thread
```

Built-in examples visible in `cli.renamed.js` include:

| Agent family | Prompt shape |
|---|---|
| Explore | Read-only codebase exploration specialist; omits `CLAUDE.md` and disallows modifying tools. |
| Plan | Read-only architecture/planning specialist; returns implementation plans without editing. |
| statusline-setup | Focused settings-editing agent for creating/updating the status line command. |
| background job | Main default/background agent with `appendSystemPrompt: true`, worktree isolation, and classifier-friendly completion conventions. |
| plugin/custom/SDK agent | Frontmatter/JSON `prompt` becomes `getSystemPrompt()`; tools, disallowed tools, MCP servers, hooks, memory, and initial prompt are agent metadata. |

## Scenario 8: tool-heavy main turn

Tools are not only prose in the system prompt. In provider calls they also appear as structured tool schemas. The prompt side explains when/how to use them, while the `tools` array controls the callable interface.

```text
SYSTEM
  - normal main prompt
  - tool-use rules and tool-result trust rules
  - dedicated tool descriptions/guards for enabled tools
  - deferred-tool instructions when large MCP/tool sets are hidden behind ToolSearch

TOOLS ARRAY
  - built-in tool schemas
  - MCP tool schemas, possibly deferred
  - plugin/custom tool schemas
  - permission metadata is enforced outside the model by runtime checks

MESSAGES
  - user request
  - tool_use / tool_result pairs
  - <system-reminder> warnings on tool output, file reads, sandbox/permission state, or recalled memory
```

This explains why a “full prompt” dump must include both the text system blocks and the structured `tools` payload; the prompt text alone is incomplete.

## Scenario 9: WebSearch helper

The built-in web-search tool uses a small helper model path instead of relying only on the main turn. At line ~3628, the code creates a user message equivalent to “perform a web search for this query,” uses a short web-search assistant system prompt, passes an extra web-search tool schema, and sets `querySource:"web_search_tool"`.

```text
SYSTEM
  - short web-search-tool role prompt

USER
  - query transformed into a search-task instruction

TOOLS
  - web_search schema selected as the helper tool

OPTIONS
  - querySource = web_search_tool
  - prompt caching disabled for this helper path
```

The helper result is then converted back into model-visible search-result content for the surrounding flow.

## Scenario 10: WebFetch apply helper

For fetched page content, the line ~3435 path truncates very large content, builds a user prompt from the page content plus the original task, and calls `iE` with an empty system prompt array.

```text
SYSTEM
  - empty helper system prompt

USER
  - fetched page content, truncated when necessary
  - user's requested extraction/summarization/application task

OPTIONS
  - querySource = web_fetch_apply
  - no tools
```

So WebFetch prompt assembly is mostly user-message construction, not a large dedicated system prompt.

## Scenario 11: compaction and continuation summaries

Compaction has multiple prompt surfaces. The common main summarization helper uses a short summarizer system prompt and passes the conversation to summarize. Reactive compaction builds compact instructions and calls the main-loop runner with `querySource:"compact"`, usually with tools disabled or tightly controlled.

```text
SYSTEM
  - summarization role prompt
  - compact-specific preservation rules

USER / MESSAGES
  - transcript sections to summarize
  - explicit compact instructions
  - security-relevant user constraints to preserve
  - optional custom compaction instructions

OUTPUT
  - compact summary message, marked as compact summary in transcript state
```

The prompt catalog contains several related entries around lines ~2067, ~2146, ~2251, and the model call at line ~4961 confirms the helper path.

## Scenario 12: hook condition evaluator

Stop-condition and hook-condition prompts are dedicated evaluator calls. The runtime can include a truncated transcript, a condition string, and a JSON schema for the answer.

```text
SYSTEM
  - hook-evaluator role prompt
  - decide whether the supplied condition is satisfied
  - return a constrained JSON result

USER / MESSAGES
  - condition text
  - transcript content or transcript path
  - hook event metadata

OUTPUT
  - JSON decision, reason, and optional impossible/error fields
```

The main anchors are line ~8903 for stop-condition evaluation and line ~8918 for broader hook evaluation with tool access and transcript-path context.

## Scenario 13: small helper prompts

Many helper calls use `iE` or `VDH` with either an empty system prompt or a short task-specific system prompt. These are not the main session prompt, but they are prompt surfaces worth tracking.

| Helper | Prompt shape | Anchor |
|---|---|---:|
| Teleport/session title + branch | Empty system prompt; user prompt asks for title/branch JSON from a description. | line ~2783 |
| GitHub issue title | Short system prompt with issue-title rules; user prompt is bug report content. | line ~5597 |
| Session title | Short title-generation system prompt; conversation wrapped as data. | line ~6606 |
| Kebab-case conversation name | Short system prompt requiring JSON `{name}`; conversation wrapped as data. | line ~6623 |
| Session search | Specialized search-agent system prompt; transcript dirs/query are user/context. | line ~6653 |
| Agent creation | Agent-architect prompt plus existing memory/context; expects JSON agent spec. | line ~7088 |
| Date/time parser | Short parser system prompt; natural-language date is user input. | line ~9343 |
| Insights/usage analysis | Often empty system prompt; user prompt contains analysis task and usage data. | line ~7975-7994 |

## Scenario 14: `/insights` usage report prompts

Reverse-engineering the `/insights` anchors shows a prompt pipeline rather than a static report writer.

| Stage | Source anchor | Prompt/data role |
|---|---|---|
| Session scan and branch pruning | `cli.renamed.js`, line ~7973 | `extractToolStats` reads session messages and `deduplicateSessionBranches` keeps the most representative branch per session. |
| Usage-report aggregation | `cli.renamed.js`, line ~7973 | `generateUsageReport` batches session metadata and cached analyses into a report input. |
| Facet synthesis | `cli.renamed.js`, line ~7982 | A helper prompt requires `RESPOND WITH ONLY A VALID JSON OBJECT` for structured goal/outcome analysis. |
| Reader summary | `cli.renamed.js`, lines ~8015, ~8078 | The `At a Glance` prompt asks for a user-facing summary of usage patterns and opportunities. |
| Final response prompt | `cli.renamed.js`, lines ~7973, ~8884 | `buildInsightsResponsePrompt` wraps `insightsJson`, report URL/path, facets directory, and summary text for the final `/insights` response. |

This makes `/insights` a helper-model workflow around local session analytics. The exact prompts are not part of the main turn prompt, but they can read derived transcript statistics and produce structured JSON before the final user-facing answer.

## How to capture a concrete full prompt

For a live session, the exact provider-visible request exists only after runtime interpolation and normalization. Useful capture points are:

1. after `lr6(...)` and `KH=H9([...])` in the main loop, to see the pre-provider system array;
2. after `QEH`/`KS4` prepends `ri$(...)` and `ii$(...)`, to see provider-ready system blocks;
3. after `sp5(...)`, to see cache-control metadata on system blocks;
4. after message normalization converts `api_system` to provider `role:"system"` or falls back to `<system-reminder>`;
5. in the prompt-cache diagnostics path that reports system-prompt changes and tool-schema hashes.

The static catalog answers “which prompt templates exist?” The scenario map above answers “how do major paths assemble them?” A runtime capture answers “what exactly did this specific request send?”

## Related docs

- [Prompt, context, and memory](prompt-context-memory.md)
- [Prompt template catalog](prompt-template-catalog.md)
- [Context, memory, compaction, checkpoints, and rewind](context-memory-compaction-checkpoints.md)
- [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md)
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md)
