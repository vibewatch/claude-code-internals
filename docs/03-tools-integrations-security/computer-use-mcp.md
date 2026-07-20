# Computer-use MCP

Claude Code contains a macOS-only, in-process MCP server named `computer-use`. It exposes screenshot, mouse, keyboard, clipboard, application, multi-monitor, batching, and optional guided-teaching tools, while a separate runtime layer enforces OS permissions, a per-session application allowlist, restricted app tiers, and a process-wide ownership lock.

This subsystem already existed in the retained `2.1.143` baseline. It is documented here because the second-round audit found that only generated prompt shards and a one-line startup reference covered it; there was no canonical hand-authored lifecycle page.

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact string or symbol | Meaning |
|---|---:|---|---|
| ComputerUseServerName | [~180,546](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L180546) | `computer-use` | MCP server/tool prefix. |
| ComputerUseLock | [~449,440-449,535](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L449440) | `computer-use.lock`, `LJu`, `mdy` | Cross-session lock with PID-based stale recovery and cleanup. |
| AppTierClassifier | [~449,650](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L449650) | `read`, `click`, `full` | Restricts browser/trading and terminal/IDE applications by category. |
| AccessRequestHandler | [~450,390](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L450390) | `handleRequestAccess`, `request_access` | TCC, app allowlist, grant flags, user deny, and policy deny flow. |
| ActionDispatcher | [~451,600](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L451600) | `hQu`, `m_s`, `handleComputerBatch` | Precondition checks and per-action execution. |
| TeachStepNormalizer | [~450,752](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L450752) | `cQu` | Validates a teaching step envelope and resolves its anchor against current pre-execution screenshot state. |
| TeachBatchHandler | [~450,864](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L450864) | `handleTeachBatch`, `uQu` | Pre-normalizes every step, then executes the normalized steps sequentially. |
| ToolSchemaFactory | [~451,700](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L451700) | `aDt` | Builds the MCP tool list and JSON Schemas. |
| SessionBoundMcpServer | [~453,000](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L453000) | `Hgo`, `g_s` | Binds per-session state to MCP `tools/list` and `tools/call`. |
| TurnCleanup | [~455,000](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L455000) | `qlt` | Unhides applications, unregisters Escape, and emits exit notification. |
| StartupRegistration | [~932,064](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L932064) | `setupComputerUseMCP`, `--computer-use-mcp` | Registers the dynamic stdio MCP server and allowed tool names. |

## Platform and startup boundary

The root action wires computer use only on macOS, in an interactive session, and when an additional enablement predicate (`Q_o()`) passes. `setupComputerUseMCP()` registers a dynamic stdio MCP config whose command is the current Claude executable and whose argument is `--computer-use-mcp`; it also derives the matching `mcp__computer-use__*` allowed-tool names from the schema factory.

The embedded native binding throws on non-macOS platforms, and the Linux executor stub explicitly reports that computer control is macOS-only. A standalone server instance without session callbacks exposes schemas but rejects calls because per-session permissions are unavailable.

## Tool families

| Family | Source-visible tools | Runtime contract |
|---|---|---|
| Access/state | `request_access`, `list_granted_applications` | Establish or inspect the per-session app allowlist and optional clipboard/system-key grants. |
| Screen inspection | `screenshot`, `zoom`, `switch_display`, `cursor_position` | Capture allowed applications, inspect a region, select a monitor, or read cursor position. |
| Pointer | `left_click`, `double_click`, `triple_click`, `right_click`, `middle_click`, `mouse_move`, `left_click_drag`, `left_mouse_down`, `left_mouse_up`, `scroll` | Target the current screenshot coordinate space and re-check app/tier state at execution. |
| Keyboard | `type`, `key`, `hold_key` | Type text or send key chords; system-level combinations need a separate grant. |
| Applications/clipboard | `open_application`, `read_clipboard`, `write_clipboard` | Operate only on approved applications and explicitly granted clipboard capabilities. |
| Batching | `computer_batch` | Runs predictable actions sequentially in one MCP call and stops at the first error. |
| Guided teaching | `request_teach_access`, `teach_step`, `teach_batch` | Optional tooltip-driven flow; active only when teach-mode callbacks are installed. |

## Access and application tiers

`request_access` is mandatory before ordinary actions. It first ensures macOS Accessibility and Screen Recording are granted, then resolves requested display names or bundle IDs against installed applications and presents a session-level approval dialog.

Three interaction tiers are source-visible:

| Tier | Allowed behavior |
|---|---|
| `read` | Visible in screenshots; no clicks or typing. Browsers and trading/finance applications default here. Browser interaction is handed to Claude-in-Chrome instead. |
| `click` | Read plus plain left-click/scroll, but no typing, key presses, right-click, modifier-click, or drag/drop. Terminal and IDE applications default here so integrated shells/editors cannot receive injected text. |
| `full` | Full pointer and keyboard interaction, subject to optional clipboard and system-key flags. |

Some media/reading applications are policy-denied before the dialog. User-denied applications are also remembered outside the session and cannot be re-requested until the user removes them from the desktop app's deny list. Managed policy denial has no user override.

Grant flags are separate from app approval:

- `clipboardRead`
- `clipboardWrite`
- `systemKeyCombos`

## Execution guards

Each action re-checks live state rather than trusting an old screenshot or approval result:

- The frontmost application must be in the allowlist and have a sufficient tier.
- Click coordinates are checked against the application currently under the point.
- Pixel validation can compare a small target patch with a fresh screenshot and reject a click when the UI changed.
- Hidden/unapproved applications are excluded at the compositor when native screenshot filtering is available. Where filtering is unavailable, the screenshot may show all windows, but input targeting unapproved apps still fails.
- System-level shortcuts require `systemKeyCombos`; clipboard calls require their corresponding grant.
- `computer_batch` applies the same guard before every action and returns completed/failed/remaining segments on the first failure.

The runtime clears a held mouse button on error/abort paths to avoid leaving the desktop in a stuck drag state.

## Guided-teaching batch semantics

`teach_batch` is available only while teach mode supplies `onTeachStep`, and it requires a non-empty `steps` array. Its validation and execution are deliberately split (`cli.renamed.js:450752-450900`):

1. `handleTeachBatch` first walks **every** step and calls `cQu` before invoking any step. `cQu` checks the step's `explanation`, `next_preview`, action-list shape and allowed action names, and optional anchor tuple; it also converts the anchor to logical coordinates immediately.
2. Only after all step envelopes normalize successfully does a second loop call `uQu` for each step in order. `uQu` presents the teaching tooltip and executes that step's actions sequentially.
3. Action-specific arguments are still validated by their handlers at execution time. Thus an invalid step envelope prevents the entire batch from starting, while a later action error can stop a batch after earlier steps/actions completed.

All anchor and click coordinates in one batch use the full-screen screenshot that existed **before the batch**. Prevalidation resolves every step anchor against the same `lastScreenshot`, and intermediate screenshot actions do not rebase later coordinates inside that batch. The embedded `teach_batch` schema states this contract explicitly and tells the caller to anchor the **next** batch against the final returned screenshot (around `cli.renamed.js:452145`).

On exit or failure the result reports completed/failed/remaining progress. A fully successful batch returns a final screenshot only when at least one step contained actions; an all-tooltip/no-action batch returns structured counts without taking that final screenshot.

## Cross-session lock

Only one Claude session may control the machine at a time. The lock record stores `sessionId`, `pid`, and acquisition time under the Claude config directory.

1. A session creates the lock atomically.
2. The same process/session can reuse its lock.
3. A live foreign PID blocks the call with `cu_lock_held`.
4. A dead PID is treated as stale; the file is removed and acquisition is retried.
5. A registered process-cleanup callback releases an owned lock.

Read-only access/list operations do not acquire the lock. The first ordinary computer action does. This is a process/session ownership boundary, not an MCP-server mutex around one individual call.

## Turn cleanup and interruption

During control, the runtime can hide non-allowed applications and register a global Escape handler so the user can interrupt. Turn cleanup:

- unhides applications hidden during the turn (with a five-second cleanup ceiling);
- unregisters the Escape hotkey and stops the native run-loop pump;
- clears active control state;
- emits an OS notification that Claude is done using the computer.

The process-level lock has separate cleanup/stale-recovery logic, so a crash does not permanently strand ownership.

## Caveats

- `computer-use` and Claude-in-Chrome are separate MCP integrations. Native application control deliberately redirects browser interaction to the browser integration when the app is read-only.
- The schema is dynamic: teach-mode tools and available-app hints appear only when their host callbacks/gates exist.
- The source contains macOS native implementation details; no Linux/Windows control implementation is confirmed in this package.

## Related docs

- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [Settings, policy, and integrations](settings-policy-and-integrations.md)
- [Accessibility and screen-reader mode](../01-runtime-lifecycle/accessibility-and-screen-reader-mode.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)
