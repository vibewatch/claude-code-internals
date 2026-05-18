# Hooks and events reference

This page is the canonical list of hook names, runtime event families, and externalized stream/control frames visible around tools, sessions, MCP, and agents. It keeps event lists out of broad narrative pages while preserving links to the implementation owners.

## Scope and caveats

- Hook names are source-visible in the analyzed `cli.renamed.js` bundle; exact input/output schemas are event-specific and may be extended by plugins or feature gates.
- This page distinguishes **hooks** from **frames** and **protocol methods**. They are all event-like, but they do not share one subscription mechanism.
- Treat `tengu_*` strings as telemetry or feature-signal names unless adjacent code/doc text confirms a public event contract.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| ToolHookEventList | `PreToolUse` | Hook event list begins. |
| SessionLifecycleHook | `SessionEnd` | Session lifecycle hook surface. |
| PreToolUseAuthorization | `hookPermissionResult`, `PreToolUse` | `PreToolUse` can participate in authorization and input mutation. |
| ToolExecutionBoundary | `function U85` | Permission/execution boundary that invokes tool decision paths. |
| SdkPermissionBridge | `createCanUseTool`, `permission_denied` | SDK/bridge permission wrapper and denial frame. |
| HookRuntimeRegistry | `HOOK_EVENT_REGISTRY` | Decoded hook runtime registry and dispatcher surface. |
| UserPromptSubmitBlocking | `UserPromptSubmit operation blocked by hook` | User-prompt submission has event-specific blocking feedback. |
| SessionStateStreamFrame | `session_state_changed` | Runtime/session state stream frame. |
| BridgeStateStreamFrame | `bridge_state` | Remote bridge state stream frame. |
| McpToolsListMethod | `tools/list` | MCP method schema family. |

## Bundle module in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `HookEventDispatcher` | 629735 | `shouldSkipHookDueToTrust`, `hasWorktreeCreateHook`, `hasInstructionsLoadedHook`, `getUserPromptSubmitHookBlockingMessage`, `getTeammateIdleHookMessage`, `getTaskCreatedHookMessage`, `getTaskCompletedHookMessage`, `persistHookOutput`, `parseElicitationHookOutput`, `hasBlockingResult` | [Bundle module map — permission, trust, hooks, and policy](../99-research-atlas/module-map-from-renamed-cli.md#permission-trust-hooks-and-policy) |

## Hook names by family

| Family | Hook names | Trigger summary |
|---|---|---|
| Tool lifecycle | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` | Before/after tool execution and tool batch completion. |
| Permission and elicitation | `PermissionRequest`, `PermissionDenied`, `Elicitation`, `ElicitationResult` | Permission prompts, denial feedback, and MCP-style elicitation completion. |
| Prompt/session lifecycle | `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `SessionEnd`, `Setup` | User input, context expansion, startup/setup, and shutdown. |
| Stop and compaction | `Stop`, `StopFailure`, `PreCompact`, `PostCompact`, `InstructionsLoaded` | Stop requests/failures, compaction boundaries, and instruction loading. |
| Agent/task lifecycle | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` | Subagent/task start, completion, and background-agent idle state. |
| Config/worktree/file | `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged` | Runtime configuration, working tree, CWD, and file-change boundaries. |
| Notification | `Notification` | External or internal notification delivery. |

## Blocking versus observational hooks

| Hook type | Examples | Runtime effect |
|---|---|---|
| Authorization hooks | `PreToolUse`, `PermissionRequest`, `PermissionDenied` | Can affect whether a tool runs, whether approval is requested, whether retry feedback is returned, or whether input is updated. |
| Lifecycle hooks | `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact` | Run at major state transitions; may record or shape boundary behavior depending on event type. |
| Observational hooks | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `TaskCompleted`, `Notification` | Observe outcomes and emit side effects without being the primary approval gate. |

### `UserPromptSubmit` blocking

The decoded hook runtime has a dedicated `getUserPromptSubmitHookBlockingMessage` helper that formats `UserPromptSubmit operation blocked by hook: ...`. This confirms `UserPromptSubmit` is not only observational: when a matching hook returns a blocking result, the user prompt is stopped before normal submission continues and the event-specific blocking text is surfaced.

Non-blocking prompt hooks remain part of the broader prompt/session lifecycle. This page records the blocking contract; prompt expansion and later prompt assembly are covered by [Prompt assembly scenarios](../02-context-model-loop/prompt-assembly-scenarios.md).

## Externalized stream/control frames

These are not hook names. They are serialized frames used by headless, SDK, bridge, or remote consumers.

| Frame or subtype | Direction | Meaning |
|---|---|---|
| `session_state_changed` | runtime → host/SDK | Session state changed, such as idle/running/requires-action. |
| `transcript_mirror` | runtime → host/SDK/store | Local transcript record mirrored to an external consumer. |
| `bridge_state` | runtime → remote host | Remote bridge connection/control state changed. |
| `control_request` / `control_response` | runtime ↔ host | Request/response control-plane pair. |
| `permission_denied` | runtime → host/SDK/model result surface | Tool was denied without an interactive approval path. |
| `can_use_tool` | runtime → host | Ask-style permission control request. |
| `permission_response` | host → runtime | Host reply to a permission/control decision. |
| `task_started`, `task_updated`, `task_progress`, `task_notification` | runtime → host/model | Task/subagent state and progress frames. |
| `prompt_suggestion` | runtime → host/SDK | Predicted next-prompt suggestion when enabled. |
| `rate_limit_event` | provider/runtime → host/SDK | Rate-limit/quota state surfaced to clients. |
| `relevant_memories` | memory subsystem → model/context | Memory recall output surfaced into a turn. |
| `elicitation_complete` | MCP/runtime → host/SDK | MCP URL-mode elicitation completed. |

## MCP protocol methods

These are JSON-RPC method names, not Claude Code hook events.

| Method family | Examples | Owner |
|---|---|---|
| Tools | `tools/list`, `tools/call` | MCP server/client runtime. |
| Resources | `resources/list`, `resources/read`, `resources/templates/list` | MCP resource runtime. |
| Prompts | `prompts/list`, `prompts/get` | MCP prompt runtime. |
| Tasks/cancel/progress | `tasks/list`, `tasks/cancel`, `notifications/cancelled`, progress notifications | MCP/task coordination. |

## Interpretation rules

1. Use **hook** for in-process extension points that can observe, block, mutate, or provide feedback.
2. Use **frame** for serialized headless/SDK/remote messages.
3. Use **protocol method** for MCP JSON-RPC method names.
4. Use **telemetry event** for `tengu_*` signal names; do not treat them as stable public hooks.

## Runtime dispatcher internals

The `HookEventDispatcher` module (loader at `cli.renamed.js:629735`, body at `cli.renamed.js:627034`) owns every hook-event surface listed above and implements one shared dispatch pipeline. The module exports both per-event entry points (`executeUserPromptSubmitHooks`, `executePreToolHooks`, `executeSessionEndHooks`, …) and the underlying primitives (`executeHooks`, `getMatchingHooks`, `hasHookForEvent`, `persistHookOutput`, `parseElicitationHookOutput`).

### Hook source layering

`hasHookForEvent(appState, sessionHookContext, eventName)` returns true if any of these sources has hooks registered for the event:

1. **Settings hooks** — `UQ()?.[eventName]` reads hooks from the merged settings tree (system / managed / user / project / local; see [Settings, policy, and integrations](settings-policy-and-integrations.md)).
2. **Main-thread agent hooks** — `getMainThreadAgentHooks()?.[eventName]`, only consulted outside subagent contexts (`!aw()`).
3. **Plugin- and skill-registered hooks** — `getRegisteredHooks()?.[eventName]`, populated at startup from plugin manifests and skills.
4. **Session-scoped hooks** — `appState.sessionHooks.get(sessionHookContext)?.hooks[eventName]`, allowing per-session overrides (used by Task subagents and the SDK).

### Hook-record types

Each matched record is one of:

| `hook.type` | Payload | Execution behavior |
|---|---|---|
| `command` | `{ shell, command, args, timeout, if }` | Spawned shell process; stdout/stderr captured; exit code 0 = success, 2 = blocking error, anything else = error. |
| `prompt` | `{ prompt, if }` | Inline LLM prompt evaluated through the main loop. |
| `agent` | `{ prompt, if }` | Spawned as a subagent (Task tool family). |
| `http` | `{ url, headers, body, if }` | HTTP request; rejected for `SessionStart` and `Setup` events. |
| `mcp_tool` | `{ server, tool, input, if }` | Calls a registered MCP tool. |
| `callback` / `function` | JavaScript function | In-process callback; skips dedup. |

### Matching pipeline (`getMatchingHooks`)

Given an event input the dispatcher derives a **match query** based on event family:

| Event family | Match query |
|---|---|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | `tool_name` |
| `UserPromptExpansion` | `command_name` |
| `SessionStart` / `ConfigChange` | `source` |
| `Setup`, `PreCompact`, `PostCompact` | `trigger` |
| `Notification` | `notification_type` |
| `SessionEnd` | `reason` |
| `StopFailure` | `error` |
| `SubagentStart` / `SubagentStop` | `agent_type` |
| `Elicitation` / `ElicitationResult` | `mcp_server_name` |
| `InstructionsLoaded` | `load_reason` |
| `FileChanged` | `basename(file_path)` |
| `TeammateIdle`, `TaskCreated`, `TaskCompleted` | (none — all configured hooks match) |

Settings hooks declare a `matcher` (regex or string). When a match query is present the dispatcher filters hook records to those whose `matcher` matches (using the session's tool aliases for tool-name events). After matching, hooks are deduplicated per type using a content hash that includes the shell, command, args, and any `if` condition — duplicate hooks across plugin/skill/settings sources collapse to one execution.

Each `command` / `prompt` / `agent` / `http` / `mcp_tool` hook may carry an `if` expression. The dispatcher evaluates these expressions through a single helper that has access to tool-call context (`toolUseContext`, `messages`). If an `if` cannot be evaluated for the current event (for example, a non-tool event), the hook is skipped with a debug message rather than throwing.

`SessionStart` and `Setup` additionally drop any matched `http` hooks for safety.

### Execution pipeline (`executeHooks`)

`executeHooks` is an async generator. The skeleton is:

1. **Trust gate** — calls `shouldSkipHookDueToTrust()`. The function returns `true` (skip) for interactive sessions where the trust dialog has not been accepted; non-interactive sessions always run hooks. Skipped events emit a debug log and exit without dispatching.
2. **Env kill switch** — `CLAUDE_CODE_SIMPLE` short-circuits all hook execution.
3. **Match** — calls `getMatchingHooks(...)`. No matches ⇒ early return.
4. **Abort check** — if the `signal` is already aborted, returns.
5. **Telemetry** — for any non-callback / non-function hook, emits `tengu_run_hook` with `hookName`, `numCommands`, per-type counts, and plugin counts.
6. **Per-record execution** — runs each hook with its declared `timeoutMs` (defaulting to the shared `timeoutMs`), invoking `executeStatusLineCommand` for status-line hooks and `executeFileSuggestionCommand` for file-suggestion hooks. Outputs that exceed `YcK` bytes are pushed through `persistHookOutput`, which spills to disk and emits `tengu_hook_output_persisted`.
7. **Hook-JSON parsing** — for hooks that return JSON, the dispatcher feeds the text through a Zod schema validator (`parseElicitationHookOutput` for Elicitation, an internal validator for the rest). Validation errors are returned as `{ validationError: "..." }` and the hook is treated as observational.
8. **Blocking detection** — `hasBlockingResult(result)` checks whether any record produced a blocking outcome. Per-family blocking messages are produced via `getPreToolHookBlockingMessage`, `getStopHookMessage`, `getUserPromptSubmitHookBlockingMessage`, `getTeammateIdleHookMessage`, `getTaskCreatedHookMessage`, `getTaskCompletedHookMessage`.

For Stop hooks specifically, `_I4(...)` knows how to handle async-rewake hooks: if a hook is configured with `asyncRewake: true`, the dispatcher backgrounds the shell command and arranges a rewake later via the task-notification queue. Exit code 2 on rewake injects `Stop hook feedback` as a system reminder.

### `executeHooksOutsideREPL`

The TUI calls `executeHooks` directly. Headless/SDK callers go through `executeHooksOutsideREPL`, which captures the dispatcher's emissions and surfaces them as `hook_started`, `hook_progress`, `hook_response` stream frames (see [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)). The output reaches the SDK as part of the same frame stream as model deltas.

### SessionEnd timeout policy

`getSessionEndHookTimeoutMs()` resolves the SessionEnd timeout in this order:

1. `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` env var (positive integer wins).
2. The longest `timeout` declared by any SessionEnd hook (converted from seconds to ms).
3. `SESSION_END_HOOK_TIMEOUT_MS_DEFAULT`.

The effective timeout is clamped to a hard ceiling (`GB5`).

### Plugin and skill attribution

`getMatchingHooks` tags each record with `hookSource` (`plugin:<name>` / `skill:<name>` / `settings`) and the plugin/skill root path. `getPluginHookCounts` aggregates per-plugin counts for telemetry. `getTelemetryHookName` and `applyHookSessionTitle` use the same attribution for analytics and session-title overrides.

### Lifecycle helpers

| Helper | Purpose |
|---|---|
| `createBaseHookInput(permissionMode, sessionId?, ctx?)` | Builds the base hook envelope: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `agent_type`, `effort`. All per-event hook payloads extend this base. |
| `hasInstructionsLoadedHook()` / `executeInstructionsLoadedHooks(...)` | Fires when `CLAUDE.md` / settings / memory files are loaded; used by tools that want to react to memory changes. |
| `hasWorktreeCreateHook()` / `executeWorktreeCreateHook(...)` / `executeWorktreeRemoveHook(...)` | Worktree spawn/teardown; the daemon validates `hasWorktreeCreateHook()` before allowing `--worktree-mode` startup. |
| `executeSetupHooks(...)` | Runs once per startup phase (`trigger` distinguishes them). |
| `executeCwdChangedHooks(...)` / `executeFileChangedHooks(...)` / `executeConfigChangeHooks(...)` | Watch hooks; the matchers carry the changed path / source. |
| `executeElicitationHooks(...)` / `executeElicitationResultHooks(...)` | Wrap MCP elicitation requests; hooks can auto-respond instead of showing the dialog. |
| `executeTeammateIdleHooks(...)` / `executeTaskCreatedHooks(...)` / `executeTaskCompletedHooks(...)` | Multi-agent / Task lifecycle. |

### `HOOK_EVENT_REGISTRY`

`HOOK_EVENT_REGISTRY` is a single object that maps each canonical hook event name to its per-event executor. It is the canonical machine-readable list of supported hooks; SDK consumers re-export it as `HOOK_EVENTS` (see [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md)).

## Related docs

- [Tool inventory and schemas](tool-inventory-and-schemas.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md)
- [Data models and frame schemas](../04-sessions-persistence-remote/data-models-and-frame-schemas.md)
- [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md)
