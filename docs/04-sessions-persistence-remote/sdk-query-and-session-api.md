# SDK query, session API, and subagent surface

This page documents the `claude-code-pkg/src/entrypoints/cli.renamed.js` module that exposes Claude Code as a programmatic SDK: the `query` async-iterator, the session management API, the subagent inspection API, the SDK MCP server helper, and the direct-connect transport. External SDK consumers (such as `@anthropic-ai/claude-agent-sdk`) re-export the same surface from this module.

Use this page together with:

- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md) for the print/`-p`/stream-JSON CLI path that wraps the same `query` function.
- [Session resume and transcripts](session-resume-and-transcripts.md) for the on-disk transcript format the SDK reads and writes.
- [Session API, events, and storage](session-api-events-and-storage.md) for the runtime state hub the SDK calls into.
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) for the agent runtime the SDK schedules.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| SdkQueryEntry | `function query({ prompt, options })` | Main SDK entry that opens a Claude Code subprocess, drives it, and exposes an async-iterable transport. |
| SdkStartup | `async function startup({ options, initializeTimeoutMs = 60000 } = {})` | Pre-warms the subprocess, runs initialization, returns a one-shot `WarmQuery` with `query()`, `close()`, and `Symbol.asyncDispose`. |
| SdkResolveSettings | `async function resolveSettings(H)` | Returns the merged settings the runtime would apply for the given options, without starting the loop. |
| SdkMcpServerFactory | `function createSdkMcpServer(H)` | Builds an in-process MCP server from JavaScript tool callbacks so SDK callers do not need a separate process. |
| DirectConnectTransport | `class DirectConnectTransport` | HTTP session-creation plus WebSocket transport for SDK Direct Connect. |
| DirectConnectError | `class DirectConnectError extends Error` | Error type raised by the direct-connect transport. |
| DirectConnectUrlParser | `function parseDirectConnectUrl(H)` | Parses `cc://` / `cc+unix://` URLs into a transport descriptor. |
| TranscriptMirrorBatcher | `class VOs` | Coalesces child `transcript_mirror` frames before calling an external store. |
| InMemorySessionStore | `class InMemorySessionStore` | In-memory implementation of the external session-store adapter. |
| SessionApi | `listSessions`, `getSessionInfo`, `getSessionMessages` | Read-only API over the configured session store. |
| SessionMutationApi | `renameSession`, `tagSession`, `deleteSession`, `forkSession`, `importSessionToStore` | Mutations over the configured session store. |
| TranscriptFoldHelper | `foldSessionSummary` | Returns a folded transcript summary suitable for resume/picker UI. |
| SubagentInspectionApi | `listSubagents`, `getSubagentMessages` | Read-only API over the subagent transcripts produced by the Task tool family. |
| SdkToolDefiner | `function tool(...)` | Type-safe SDK helper for defining a Claude Code tool with Zod input/output schemas. |
| HookEventsConstant | `HOOK_EVENTS` | SDK-exported list of hook event names (mirrors the runtime list in [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md)). |
| ExitReasonsConstant | `EXIT_REASONS` | SDK-exported list of conversation exit reasons. |
| SystemPromptDynamicBoundary | `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` | Sentinel string separating stable/dynamic system-prompt sections (see [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)). |
| EscalatingDefaultModeFilter | `filterEscalatingDefaultMode` | Filters permission-mode escalations so the SDK does not surface escalations that are blocked by policy. |
| SdkAbortError | `class AbortError extends Error` | SDK-exported abort error used by `query` cancellation. |
| ForwardSubagentText | `--forward-subagent-text`, `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT` | Includes subagent text/thinking as parent-linked stream-JSON messages. |
| MidTurnModelControl | `set_model` control request | Applies during an active headless/SDK turn; the next model round trip uses the new model. |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `SdkQueryAndSessionApi` | 605109 | `query`, `startup`, `resolveSettings`, `tool`, `createSdkMcpServer`, `parseDirectConnectUrl`, `DirectConnectTransport`, `DirectConnectError`, `InMemorySessionStore`, `HOOK_EVENTS`, `EXIT_REASONS`, `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, `filterEscalatingDefaultMode`, `foldSessionSummary`, `importSessionToStore`, `forkSession`, `deleteSession`, `tagSession`, `renameSession`, `getSessionMessages`, `getSessionInfo`, `listSessions`, `getSubagentMessages`, `listSubagents`, `AbortError` | [Bundle module map — session, transcript, agent metadata, and teammate IPC](../99-research-atlas/module-map-from-renamed-cli.md#session-transcript-agent-metadata-and-teammate-ipc) |

## SDK surface map

```mermaid
flowchart TD
    Caller[SDK consumer / external program] --> Query[query]
    Caller --> Startup[startup]
    Caller --> SessionApi[Session API]
    Caller --> SubagentApi[Subagent API]
    Caller --> McpHelper[createSdkMcpServer]
    Caller --> DirectConnect[parseDirectConnectUrl + DirectConnectTransport]

    Query --> Subprocess[Spawn / attach Claude Code subprocess]
    Startup --> WarmSubprocess[Pre-warm subprocess + initializationResult]
    Subprocess --> Transport[(query stream / control frames)]
    WarmSubprocess --> WarmQuery[WarmQuery wrapper<br/>query(), close(), Symbol.asyncDispose]
    WarmQuery --> Subprocess

    SessionApi --> Store{configured session store}
    SubagentApi --> Store
    SessionMutation[renameSession / tagSession / forkSession / deleteSession / importSessionToStore] --> Store
    Store -->|sessionStore option| InMem[External SessionStore<br/>including InMemorySessionStore]
    Subprocess --> LocalDisk[Required local JSONL staging]
    LocalDisk --> Mirror[transcript_mirror after successful append]
    Mirror --> InMem

    McpHelper --> McpServer[In-process MCP server bound to JS callbacks]
    DirectConnect --> CreateSession[POST /sessions]
    CreateSession --> WebSocket[Returned WebSocket URL]
```

## Core entry points

### `query({ prompt, options })`

`query` is the SDK's primary async-iterable surface. It accepts a prompt (string or an async-iterable of input messages) and an options bag, opens a Claude Code subprocess with the right transport and abort controller, and returns an iterator that yields the same stream-JSON frames documented in [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md).

Key options the SDK accepts:

- `cwd`, `dir`, `env` — process identity for the subprocess.
- `resume`, `forkSession`, `loadTimeoutMs`, `sessionStore` — control how the session is restored, including mirroring through an [`InMemorySessionStore`](#external-session-store-and-local-staging).
- `model`, `fallbackModel`, `permissionMode`, `allowedTools`, `disallowedTools`, `mcpServers`, `agents`, `hooks`, `outputStyle`, `appendSystemPrompt` — same shape as the corresponding root surfaces in [Command-line reference](../01-runtime-lifecycle/command-line-reference.md).
- `signal`, `abortController` — cancellation. Triggers a `SdkAbortError`.

In stream-JSON mode, `--forward-subagent-text` (or its environment equivalent) forwards delegated text/thinking with `parent_tool_use_id`, while normal mode keeps that internal to the agent result. Model-control requests are no longer deferred to the following user turn: a valid `set_model` received mid-turn affects the next provider round trip in the current turn.

An external `sessionStore` does not replace the subprocess's local writer. The option is rejected with `persistSession: false`: a local append must succeed before the child emits a `transcript_mirror` frame. For ephemeral staging, the source error recommends a temporary `CLAUDE_CONFIG_DIR`. A custom subprocess launcher must give parent and child the same normalized config-directory path or mirror frames are dropped.

### `startup({ options, initializeTimeoutMs }) -> WarmQuery`

`startup` pre-warms a subprocess: it runs `initializationResult()` to wait for full SDK startup, then returns a `WarmQuery` wrapper exposing exactly one `.query(input)` call plus `.close()` and `Symbol.asyncDispose`. The wrapper guards against re-use and ensures cleanup callbacks run even if `query()` throws.

The default initialization timeout is 60 seconds. Closing/disposal first runs cleanup callbacks, flushes any transcript mirror batcher best-effort, rejects pending control/MCP requests, closes SDK MCP transports, and closes the subprocess transport. The transport ends stdin, sends `SIGTERM` after its close grace period, and escalates to `SIGKILL` five seconds later if needed; query cleanup waits at most two seconds for process exit. These are cleanup bounds, not an `fsync` durability guarantee.

### `resolveSettings(options) -> ResolvedSettings`

Returns the same settings object the runtime would apply, without spawning the loop. Used by SDK callers that need to inspect the effective configuration (model selection, MCP server roster, permission rules) before deciding whether to start a session.

## Session API

| Function | Behavior |
| --- | --- |
| `listSessions(options)` | Lists sessions from `options.sessionStore` when provided, otherwise falls back to the on-disk local-jsonl store. |
| `getSessionInfo(id, options)` | Returns session metadata (title, tags, model, agent name, transcript path). |
| `getSessionMessages(id, options)` | Returns the message history; uses the configured session store. |
| `renameSession(id, newName, options)` | Updates the stored session title; persists to disk when using the default store. |
| `tagSession(id, tag, options)` | Appends a tag frame; `null` clears the tag. |
| `deleteSession(id, options)` | Removes the session from the configured store. |
| `forkSession(id, options)` | Creates a new session that branches from the existing transcript at the resume point. |
| `importSessionToStore(sessionId, store, options?)` | Reads a local transcript (and, by default, subagents) and appends it to the supplied store in batches. |
| `foldSessionSummary(messages)` | Returns a folded summary suitable for resume/search UI. |

All mutating functions accept an `options.sessionStore` to redirect from the default local-jsonl store. Rename and tag remain append operations in that store; delete is a no-op when the adapter does not implement optional `delete()`. Fork requires `load()` plus `append()`. See [Session resume and transcripts](session-resume-and-transcripts.md) and [Session API, events, and storage](session-api-events-and-storage.md) for the underlying behavior.

### External session store and local staging

The required adapter methods are `append(key, entries)` and `load(key)`. Optional methods such as `listSessions`, `listSessionSummaries`, `delete`, and `listSubkeys` unlock the corresponding listing/deletion/subagent APIs. `InMemorySessionStore` implements these in process memory, but it does **not** make an SDK query disk-free: the child still writes local JSONL before the parent receives the mirror.

Ordering is local append → child `transcript_mirror` frame → parent batcher → `SessionStore.append()`. The batcher coalesces records by file path and starts draining when pending totals exceed 500 entries or 1,048,576 JavaScript serialized-string length units; despite the `pendingBytes` name, this is not a UTF-8 byte measurement or a hard batch-size cap. It applies a 60-second timeout per append call and retries ordinary failures after 200 and 800 ms (three attempts total). A timeout is not retried. Final failure emits a `system/mirror_error`; it does not roll back the local JSONL append.

When resuming from an external store, setup loads the entries into a temporary local config/transcript tree, starts the child against that path, and removes the tree after the subprocess exits. External-store read/parse failure therefore happens before process initialization, while temporary cleanup remains best-effort rather than transactional.

`importSessionToStore()` is also ordered but non-transactional. It imports the main JSONL first in batches of 500 entries by default (or a positive `batchSize`) and also flushes after roughly 1 MiB measured as JavaScript line-string length, not UTF-8 bytes. Both are flush thresholds, not input caps: one arbitrarily long line is read and parsed before either threshold can act. Empty or malformed lines are skipped, but every successfully parsed JSON value is forwarded without transcript-record schema validation, including primitives. Unless `includeSubagents === false`, the importer then recursively enumerates actual directory/file entries (not symlinked subagent entries); for each subagent JSONL it appends transcript batches before reading an optional `.meta.json` sidecar. The parsed sidecar is shallow-spread after a default `type:"agent_metadata"`, so a sidecar-supplied `type` can override that default and no metadata schema is enforced. Missing sidecars are silent, other read/parse errors are logged and skipped, and any subagent-directory enumeration error silently omits that subtree. Store `append()` failures propagate and stop the import, but earlier successful main/subagent batches remain: there is no rollback or all-session transaction, and no stable cross-subagent order is imposed beyond the filesystem enumeration. The API takes no abort signal and has no importer-level lock; one invocation awaits its own appends in order, but separate concurrent imports can interleave according to the adapter's behavior.

Source selection has two identity edges. The public function first rejects a non-UUID `sessionId`. With `options.dir`, resolution searches that canonical project's directories and related worktrees. Without it, the resolver scans all project directories and takes the first non-empty `${sessionId}.jsonl` in filesystem enumeration, while the destination `projectKey` is still derived from the caller's current/default directory; duplicate session IDs can therefore be selected ambiguously and imported under that current key. Candidate `stat()` and directory-enumeration errors are swallowed, so permission and I/O failures can collapse into the same `Session <id> not found` error as true absence. Resolution accepts any non-empty stat target rather than requiring a regular file, follows symlinks, and later opens the pathname as a stream; no opened-descriptor identity or fixed-length snapshot joins discovery to reading. Concurrent replacement or append can change what one import observes, while a directory or other unsuitable target fails only when the stream is opened/read.

## Subagent inspection API

| Function | Behavior |
| --- | --- |
| `listSubagents(sessionId, options)` | Lists subagent IDs produced by the Task tool family for a given parent session. |
| `getSubagentMessages(sessionId, subagentId, options)` | Returns the subagent's transcript filtered to user/assistant messages. |

These read the subagent transcripts off the same on-disk layout described in [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md). They are inspection APIs; they do not spawn subagents.

## SDK MCP server helper

`createSdkMcpServer(options)` builds an in-process MCP server backed by JavaScript callbacks. SDK callers can register tools with `tool(...)` (which uses Zod schemas) without launching a separate MCP process. The result is the same MCP server interface documented in [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md), so the runtime's MCP coordinator treats it identically to a stdio/socket-backed server.

## Direct-connect transport

`parseDirectConnectUrl` parses `cc://host:port` into HTTP connection metadata and treats the path component as a bearer token. It recognizes `cc+unix:///socket/path` only to reject it as not yet supported. Session creation sends `POST /sessions` with optional `cwd`, caller-supplied `session_key`, and `permission_mode`. A successful response must contain `session_id` and `ws_url`; `work_dir` and `session_key` are optional. The visible response adapter retains the session ID, WebSocket URL, and work directory, but does not copy a returned `session_key` into transport state.

The returned WebSocket must open within 15 seconds. Incoming data is newline-delimited JSON: complete valid lines are enqueued, malformed lines are debug-logged and dropped without terminating the connection, and an unterminated trailing fragment is retained only until another chunk supplies a newline. If the socket closes first, that fragment is not emitted. Session-create failures, non-2xx responses, malformed creation payloads, connection timeout, socket errors, and abnormal close surface as transport/query failures.

The decoded transport has no reconnect or sequence-resume loop. A caller that wants to retry must create a new Direct Connect session. Do not transfer the replay behavior of Remote Control or hosted `SessionsV2Client` onto this transport. Server-side session lifetime, persistence, and authentication semantics remain outside the client artifact.

When `deleteSessionOnClose` is enabled, a client-initiated `close()` after session creation fires a best-effort `DELETE /sessions/:session_id`. The call is not awaited, response status is not checked, and network errors are swallowed. A socket that has already transitioned the transport to closed causes a later `close()` to return early, so this option is not proof that every peer-terminated session is deleted or that server-side data is erased.

## Exported constants

| Constant | Use |
| --- | --- |
| `HOOK_EVENTS` | Canonical hook-event list mirrored from the runtime; SDK consumers iterate it to register handlers. |
| `EXIT_REASONS` | Canonical exit-reason list returned in the final stream frame. |
| `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` | Sentinel separating stable from dynamic system-prompt sections; SDK callers that postprocess prompts split on this. |

## Safe interpretation rules

- This module is the SDK's public surface; the actual subprocess is still the bundled `cli.renamed.js` runtime. The SDK does not bypass permission rules, hooks, or remote-control gates.
- `query` always opens a fresh subprocess; reuse the same `WarmQuery` only inside one logical conversation. `startup` is designed for one-shot use.
- Mutating session APIs operate on whichever `sessionStore` the caller passes; without one they touch the local-jsonl transcript directory. Always pass an explicit store in tests.
- External-store append is a bounded retry path, not an exactly-once transaction. The source exposes no idempotency token or rollback, so adapters should tolerate a repeated batch if a call's outcome is ambiguous.
- Local-to-store import can leave a partially imported session when a later batch, subagent, or metadata append fails. Callers that retry should account for whatever duplicate/idempotency semantics their adapter implements.
- Pass `dir` when importing and protect the local transcript tree from concurrent mutation. Without it, source-project selection can be ambiguous; the importer does not provide no-follow or snapshot isolation for its input files.
- Direct Connect failures are surfaced, but automatic retry is not implemented; callers must choose whether creating a new server session is safe.

## Related docs

- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Session API, events, and storage](session-api-events-and-storage.md)
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
- [Bundle module map](../99-research-atlas/module-map-from-renamed-cli.md)
