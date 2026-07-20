# Prompt assembly scenarios

This page reverse-engineers the major Claude Code prompt shapes from the analyzed `cli.renamed.js` bundle. It intentionally uses **scenario skeletons** instead of copying long bundled prompt bodies: the goal is to show which fragments are selected, how they are ordered, and which runtime values fill the gaps.

For exact provider-facing prompt text for one live session, instrument or capture the request after runtime interpolation. The static [Prompt template catalog](prompt-template-catalog.md) keeps hashes, previews, and anchors for this extracted build without retaining generated JSON artifacts.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| DynamicPromptBoundary | `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | Boundary between cache-stable and per-session/per-machine prompt sections. |
| SystemPromptResolver | `vne()` | Resolves total override, coordinator, agent replacement/append, custom/default base, and late append branches. |
| DefaultPromptBuilder | `M2()` | Builds the default system-prompt fragment array and marks the dynamic boundary. |
| PromptPartsFetcher | `fetchSystemPromptParts()` | Returns `{defaultSystemPrompt,userContext,systemContext}` and redirects dynamic sections when requested. |
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
| ProviderRequestAssembler | `callModel()` → `Ead()`, `qSy()`, `asSystemPrompt()`, `KSy()`, `messages.create(...)` | Main/helper request assembly, message normalization, provider system blocks, cache metadata, and final dispatch. |
| MainLoopPromptInputs | `customSystemPrompt`, `appendSystemPrompt`, `mainThreadAgentDefinition` | Current main-loop inputs passed to `vne()`. |
| PromptOverrideFlags | `--system-prompt`, `--append-system-prompt`, files, `--exclude-dynamic-system-prompt-sections` | CLI override/append/dynamic-section controls and file loading. |

Current implementation anchors are [`vne()` near line 333575](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L333575), [`fetchSystemPromptParts()` near line 563486](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L563486), and the default builder/dynamic boundary near [lines 568000–569300](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L568000). The older aliases previously listed on this page are not used as behavioral anchors for `2.1.215`.

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

The default interactive session is not one giant literal. `fetchSystemPromptParts()` first constructs three different families, then `vne()` chooses the base text array. Structured tools remain outside all three:

```text
DEFAULT SYSTEM PROMPT (M2)
  main interactive-agent base
  - identity as an interactive software-engineering agent
  - terminal/markdown/tool-output harness rules
  - tool permission mode expectations
  - system-reminder and tool-result trust rules
  - prompt-injection caution for external tool output
  - compaction/context-continuation behavior

  - prefer minimal task-scoped changes
  - do not over-engineer or add speculative abstractions
  - preserve user work and avoid risky destructive actions
  - ask/adjust when permission is denied
  - respect output style and language settings

  stable capability guidance and dynamic sections around
  __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__
  - model name / model family hints
  - cwd, shell, platform, OS version
  - additional working directories
  - git repository and git status summaries
  - settings-derived mode flags

USER CONTEXT MAP
  - user/org/project instructions and memory-file context
  - context intended to travel with user-visible conversation input

SYSTEM CONTEXT MAP
  - dynamic context normally supplied as system-side context

SELECTED SYSTEM PROMPT (vne)
  - default prompt, unless another branch replaces or layers it
  - appendSystemPrompt last when the selected branch permits it

MESSAGES
  - normalized transcript
  - user prompt and attachments
  - runtime <system-reminder> blocks injected near the relevant turn

STRUCTURED TOOLS
  - built-in tools selected for the current mode
  - MCP/plugin/custom tools that survived filtering/defer policy
```

`M2()` supplies default prompt fragments, `fetchSystemPromptParts()` supplies the context maps, and the provider request path normalizes/cache-decorates those values later. Memory files and tool schemas should not be described as literal `SYSTEM[n]` blocks merely because they count toward total context.

## Scenario 2: custom `--system-prompt`

When `--system-prompt` or `--system-prompt-file` supplies the `overrideSystemPrompt` lane, `vne()` returns `[overrideSystemPrompt]` immediately. This is a total base-prompt replacement branch.

```text
SELECTED SYSTEM PROMPT
  <user supplied override text>

MESSAGES
  - transcript and current user message
  - dynamic reminders may still appear as messages/api_system blocks

TOOLS
  - selected tool schemas still travel separately from the prompt text
```

Important edge cases:

- `--system-prompt` and `--system-prompt-file` are mutually exclusive; the same is true for append prompt vs append prompt file.
- `--exclude-dynamic-system-prompt-sections` is documented as applying only with the default system prompt, so it is ignored when the system prompt is replaced.
- The total `overrideSystemPrompt` branch returns before `vne()`'s ordinary append branch. Do not promise that a separately supplied general append survives this branch unless the caller has already merged it into the override input.
- Request-level normalization, structured tool schemas, transcript messages, and runtime reminders still exist outside the replaced base prompt.

## Scenario 3: default prompt plus appended prompt

The ordinary append path preserves the selected default/custom/agent base and places `appendSystemPrompt` last.

```text
SELECTED SYSTEM PROMPT
  normal default/custom base fragments
  <appendSystemPrompt>

MESSAGES / TOOLS
  - same as the default interactive session
```

Upstream CLI/policy wiring can contribute to the value passed as `appendSystemPrompt`; `vne()` itself observes one late append input rather than exposing separate guaranteed CLI-versus-policy slots.

## Scenario 4: default prompt with dynamic sections excluded

With `--exclude-dynamic-system-prompt-sections`, `fetchSystemPromptParts()` keeps the default prompt's stable fragments but merges the normally system-side dynamic map and the separately generated excluded sections into `userContext`; it returns an empty `systemContext`.

```text
SYSTEM
  - stable default system prompt sections
  - stable tool/capability instructions
  - appended prompt, if present

FIRST USER MESSAGE
  <redirected user-context sections>
    - cwd
    - environment info
    - memory paths
    - git status

SUBSEQUENT MESSAGES
  - normal transcript and user turns
```

The exact insertion helper later maps that user-context object into early conversation context. The important design point is that cache-stable identity/rules text can remain cacheable while high-churn local state is redirected away from `systemContext`; structured tools remain separate.

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

## Scenario 6: coordinator or selected main-thread agent

Prompt selection is controlled by `vne()`. Its branch matrix is compact enough to state exactly:

```text
if overrideSystemPrompt exists:
  SYSTEM = [overrideSystemPrompt]
else if coordinator mode is active and no main-thread agent exists:
  SYSTEM = [coordinator prompt, append prompt?]
else if agent prompt exists and agent.appendSystemPrompt is true:
  SYSTEM = [custom/default base, agent prompt, append prompt?]
else if agent prompt exists:
  SYSTEM = [agent prompt, append prompt?]
else:
  SYSTEM = [custom/default base, append prompt?]
```

The practical consequences are:

- most custom agents with their own prompt replace the default main-session body;
- agents marked `appendSystemPrompt: true` layer their prompt on top of the main-session prompt;
- `--append-system-prompt` remains a late append in either case;
- custom/SDK/plugin agents can add memory-derived text to `getSystemPrompt()` when the relevant memory feature is active.

The coordinator branch builds its own prompt based in part on whether a comms-role MCP server is present. It does not first build the ordinary default prompt and then append coordinator text.

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

For fetched page content, the helper path truncates very large content, builds a user prompt from the page content plus the original task, and invokes the shared model-call wrapper with an empty system prompt array.

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

Many helper calls use the shared model-call wrappers with either an empty system prompt or a short task-specific system prompt. These are not the main session prompt, but they are prompt surfaces worth tracking.

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

1. after `M2()` / `Jw()` / `ux()` and `vne()` in the main loop, where the query handoff contains `messages`, `systemPrompt`, `userContext`, `systemContext`, selected tools, and cache-breaker state;
2. at `callModel()` / `Ead()` entry, where the resolved system-prompt array, transcript, thinking configuration, selected tools, and model-call options meet;
3. after `qSy()` message normalization, to compare `messagesPreNormalize` with `messagesForAPI` and see whether `api_system` survived as provider `role:"system"` or took the fallback path;
4. after `asSystemPrompt()` and `KSy()`, where runtime prefix blocks are prepended and system-block cache metadata is applied;
5. in the request-body builder immediately before `messages.create(...)`, where the final `model`, normalized `messages`, `system`, structured `tools`, `tool_choice`, betas, metadata, thinking/effort, cache controls, and extra body parameters are all present.

The first point captures Claude Code's assembled query inputs, while the fifth captures the provider-visible body for a particular attempt. They can differ because normalization, capability gates, retries, and cache decoration occur between them. Capture tooling must redact secrets and sensitive local context; authorization headers are transport data, not part of the prompt.

The static catalog answers “which prompt templates exist?” The scenario map above answers “how do major paths assemble them?” A runtime capture answers “what exactly did this specific request send?”

## Related docs

- [Prompt, context, and memory](prompt-context-memory.md)
- [Prompt template catalog](prompt-template-catalog.md)
- [Context, memory, compaction, checkpoints, and rewind](context-memory-compaction-checkpoints.md)
- [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md)
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md)
