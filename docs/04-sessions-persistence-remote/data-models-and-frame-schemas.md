# Data models and frame schemas

This page centralizes observable session data models, transcript record families, bridge/control frames, and protocol-shaped message families. It is intentionally schema-oriented; narrative flows remain in the session and protocol pages.

## Scope and caveats

- These are reconstructed shapes from source-visible strings and existing implementation docs, not official public JSON Schemas.
- `cli.renamed.js` is minified; exact object validation and optional fields can be mode- or feature-gate-dependent.
- External consumers should validate liberally and prefer live SDK/runtime schemas when available.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| LocalJsonlTranscriptSource | `transcriptSource:"local-jsonl"` | Sessions default to local JSONL transcript storage. |
| CurrentSessionJsonlName | `` `${v$()}.jsonl` `` | Current-session JSONL file naming. |
| SessionDiscovery | `async function loadConversationForResume` | Resume/latest-session discovery. |
| TranscriptRestore | `async function f7o` | Transcript restore into the live envelope. |
| TranscriptRecorder | `recordTranscript` | Durable transcript append/export surface. |
| OrderedTranscriptStore | `class ROd`, `drainQueuesOnce` | Per-file queue that appends locally before emitting mirror frames. |
| FileHistorySnapshotRecorder | `recordFileHistorySnapshot` | File-history snapshot storage. |
| ContextCollapseSnapshotRecorder | `recordContextCollapseSnapshot` | Context-collapse snapshot storage. |
| EndedByModelRecorder | `markSessionEndedByModel`, `ended-by-model` | Durable marker that prevents resumed work in a model-ended conversation. |
| ObserverRefRecorder | `recordObserverRef`, `observer-ref` | Pointer from an observed transcript to its observer task/type. |
| SdkSessionStoreAdapter | `sessionStore` | SDK/external storage adapter hook. |
| SessionStateFrame | `session_state_changed` | Runtime/session state stream frame. |
| TranscriptMirrorFrame | `transcript_mirror` | Transcript mirror stream frame. |
| BridgeSessionRecord | `type:"bridge-session"` | Persists the Remote Control bridge identity and replay cursor. |
| BridgeStateFrame | `bridge_state` | Remote bridge state stream frame. |
| ControlRequestFrame | `control_request` | Host/SDK control request frame. |
| ControlResponseFrame | `control_response` | Host/bridge control response event type. |
| PermissionResponseFrame | `permission_response` | Permission response/control frame. |
| BridgeToolCallFields | `target_device_id`, `permission_mode`, `allowed_domains` | Browser/MCP bridge tool-call frame fields. |
| PermissionResponseFields | `request_id`, `allowed` | Permission response payload fields. |
| RemoteControlRequestRequirement | `sendControlRequest not yet wired` | Remote transport wrapper requires a concrete `sendControlRequest` implementation. |
| WebSocketAuthFd | `CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR` | Remote/session ingress token source for bridge auth. |
| SessionAccessToken | `CLAUDE_CODE_SESSION_ACCESS_TOKEN` | Session access token source for remote/bridge auth. |

## Session model

| Layer | Observable fields or records | Responsibility |
|---|---|---|
| Session identity | Local session UUID, JSONL filename, optional alias/name; optional hosted bridge ID in metadata. | Stable address for local state plus an explicit link to a distinct Remote Control object. |
| Durable transcript | User/assistant messages, tool use/results, hook/event records, context-collapse and bridge records. | Ordered append and branch replay history for restore/continue/fork. |
| Live envelope | Model state, cwd, permission mode, visible tools, hooks, agents/tasks, bridge state. | Process-time runtime state rebuilt from flags/settings/transcript. |
| Metadata/index | Title/summary, cwd, git branch/tag, timestamps, alias records. | Session picker, latest-session discovery, and restore metadata. |
| File/checkpoint state | File-history snapshots, leaf checkpoints, context-collapse snapshots. | Rewind and checkpoint restore. |
| External mirror | `sessionStore`, `transcript_mirror` frames. | Optional SDK/external mirroring emitted only after successful local append. |

## Transcript record families

| Record family | Typical contents | Owner |
|---|---|---|
| Message records | Role, content blocks, model/tool-use IDs, timestamps. | Session transcript and context restore. |
| Tool records | Tool name, tool input/result, errors, permission/denial metadata. | Tool execution and permission pages. |
| Hook/event records | Hook name, event input/output, decision or observation metadata. | Hook runtime and audit trail. |
| File-history records | Paths, snapshots, checkpoint IDs, restore metadata. | Rewind/checkpoint mechanics. |
| Context-collapse records | Summary/replacement metadata, token-savings metadata, commit records. | Context compaction. |
| Session-lifecycle records | `ended-by-model` with timestamp/session ID. | Conversation termination and resume guard. |
| Sidechain/subagent records | Parent session ID, task/subagent transcript linkage, optional `observer-ref`. | Agent/task and observer runtime. |
| Queue/control records | Pending task/control operations and bridge messages. | SDK/remote/task control plane. |
| Remote Control linkage | `bridge-session` with local `sessionId`, `bridgeSessionId`, `lastSequenceNum`, optional `declaredDialogKinds`, optional `sessionGroupingId`. | Reattaches a non-fork local resume to a distinct hosted bridge and its replay cursor. |

### `2.1.215` lifecycle records

| Record | Source-visible fields | Restore behavior |
|---|---|---|
| `ended-by-model` | `type`, `timestamp`, `sessionId` | Loader collects marked session IDs; resume sets `appState.endedByModel`, which rejects later turns and most prompt commands. `/clear` resets the live flag by starting a new conversation rather than deleting the marker. |
| `observer-ref` | `type`, `timestamp`, optional observed `agentId`, `observerTaskId`, `observerAgentType` | Routed to the observed main/agent transcript. Reattachment accepts the pointer only when the observer type still matches, its transcript exists, and it was not explicitly stopped. |

Neither record is an ordinary model message. `ENTRY_APPEND_POLICY` stores `ended-by-model` as `always` and routes `observer-ref` by agent so persistence can outlive the in-memory lifecycle registries.

### `bridge-session` record

The record is append-only metadata; the loader takes later values for a local `sessionId`.

| Field | Meaning |
|---|---|
| `type: "bridge-session"` | Record discriminator. |
| `sessionId` | Local session UUID whose transcript contains the link. |
| `bridgeSessionId` | Hosted Remote Control bridge ID; an empty string is the clear/tombstone value. |
| `lastSequenceNum` | Last accepted bridge sequence used for replay on reattach; clear writes `0`. |
| `declaredDialogKinds?` | Last non-empty set of dialog kinds declared by the bridge. |
| `sessionGroupingId?` | Optional hosted grouping identity, parsed into `bridgeSessionGroupingId` on intermediate log objects. |

Metadata re-append preserves the current in-memory bridge fields near the transcript tail. A clear/tombstone record writes an empty bridge ID and sequence `0`; because it omits dialog/grouping fields, the parser deletes their prior values too. Ordinary `loadConversationForResume()` returns bridge ID, sequence, and dialog kinds but omits the parsed `bridgeSessionGroupingId`. Its non-fork CLI restore therefore does not rehydrate grouping through this path, while a CLI fork explicitly clears the returned ID, sequence, and dialog kinds. The fork does not write a grouping tombstone to the original transcript.

## Stream and control frame families

| Frame or subtype | Direction | Observable role |
|---|---|---|
| `session_state_changed` | runtime → SDK/host | Session state changed. |
| `transcript_mirror` | runtime → SDK/external store | Batch of transcript entries emitted after the corresponding local append succeeds. |
| `bridge_state` | runtime → remote host | Remote bridge status changed. |
| `control_request` | runtime → host | Runtime asks a host to approve or perform control-plane work. |
| `control_response` | host → runtime | Host resolves a prior control request. |
| `permission_response` | host → runtime | Host returns a tool permission decision. |
| `permission_denied` | runtime → host/SDK/model result | Tool call was denied without an ask-style approval path. |
| `task_started`, `task_updated`, `task_progress`, `task_notification` | runtime → host/model | Task or subagent lifecycle/progress output. |
| `prompt_suggestion` | runtime → SDK/host | Predicted next prompt when enabled. |
| `rate_limit_event` | provider/runtime → SDK/host | Rate-limit/quota state surfaced to consumers. |
| `relevant_memories` | memory subsystem → model/context | Memory recall surfaced for a turn. |
| `elicitation_complete` | MCP/runtime → SDK/host | MCP URL-mode elicitation completed. |

## Permission/control shape

| Shape | Key fields visible in docs | Notes |
|---|---|---|
| Tool permission request | tool name, tool input, tool-use ID, optional agent/task context. | Used before tool execution for ask-style decisions. |
| Tool permission denial | tool name, tool-use ID, reason type, reason/message, optional agent ID. | Can become `permission_denied` frame and model-visible denial result. |
| `PreToolUse` result | decision (`allow`, `ask`, `deny`, `defer`), `updatedInput`, `additionalContext`, reason. | Participates in authorization and input mutation. |
| Host control response | request ID plus decision/response payload. | Resolves a `control_request`. |

## Remote and bridge frame shape notes

The source-visible frame schemas are not a complete public protocol specification, but several payload shapes are now anchored enough to document safely.

| Frame or object | Direction | Source-visible fields | Interpretation |
|---|---|---|---|
| Bridge tool call | runtime → bridge/server | `type:"tool_call"`, `tool_use_id`, `client_type`, `tool`, `args`, optional `target_device_id`, `permission_mode`, `allowed_domains`, `handle_permission_prompts`, `session_scope` | Remote/browser-backed tools are sent as typed JSON frames with the original tool name and arguments plus policy/session hints. |
| Permission response | bridge/server → runtime | `type:"permission_response"`, `request_id`, `allowed`, optional `target_device_id` | The host resolves an ask-style permission prompt for a specific request. |
| Remote bridge state | runtime → SDK/host | `type:"system"`, `subtype:"bridge_state"`, `state`, `detail`, `uuid`, `session_id` | Remote Control initialization and state changes are emitted as system stream frames. |
| Remote transport wrapper | in-process runtime object | `kind`, `isRemoteMode`, `viewerOnly`, `sessionId`, `sendMessage`, `cancelRequest`, `disconnect`, `sendControlRequest` | The local runtime wraps remote transports behind a common control interface; viewer-only transports cannot send control requests. |
| Control response event | host/bridge → runtime | `payload.type` or `event_type` equals `control_response` | Control responses are routed as bridge events and pass device-attestation checks before being accepted. |

Remote Control frame detail remains feature-gate and transport dependent. Consumers should treat these shapes as observed bundle anchors, not as a frozen external API, and should keep accepting unknown optional fields.

### Sequence and reconnect notes

- Remote Control worker SSE sends both `from_sequence_num` and `Last-Event-ID`, advances a monotonic local cursor for numeric IDs, and suppresses recently seen duplicate sequence numbers. That cursor is the value persisted in `bridge-session`.
- Hosted `--remote` uses a separate `SessionsV2Client`. It also resumes by sequence, stops after five reconnect attempts, and surfaces `catch_up_truncated` when the server cannot provide a complete catch-up range.
- Direct Connect and the Chrome browser-tool `BridgeClient` do not share this persisted transcript cursor. Direct Connect has no source-visible reconnect loop.
- These fields and client rules do not prove server-side exactly-once delivery, replay retention length, or compatibility across versions.

### Persistence ordering note

The main store serializes queued drains in-process and preserves record order for one target file. Each chunk is appended locally before mirror callbacks run; a failed append logs/telemeters the failure, resolves the remaining batch waiters, and does not emit that chunk to mirrors. External SDK storage is a later batched/retried stage and cannot roll back local JSONL. No cross-process lock or atomic multi-line transaction is visible.

## Remote/session storage areas

| Storage area | Evidence | What is stored |
|---|---|---|
| Project/session transcripts | `projects`, `` `${sessionId}.jsonl` ``, `recordTranscript` | Append-only JSONL transcript and session records. |
| Session metadata/index | `listSessions`, `getSessionInfo`, alias/metadata restore helpers | Picker/latest-session metadata. |
| File history/checkpoints | `recordFileHistorySnapshot`, checkpoint/rewind surfaces | Snapshots used for rewind and restore. |
| Context-collapse data | `recordContextCollapseSnapshot`, collapse commit/replacement records | Compaction metadata and summary replacement records. |
| Sidechain/subagent transcripts | sidechain/subagent transcript loaders | Subagent/task history separate from the main transcript view. |
| Lifecycle pointers | `ended-by-model`, `observer-ref`, `readLastObserverRef` | Durable termination state and observer reattachment metadata. |
| Remote metadata | remote-agent and bridge-session metadata helpers | Remote/bridge/agent metadata linked to a local session. |
| Queues | queue operation records and task message handling | Pending task/control messages. |
| Debug/ops logs | debug log env vars and `latest` symlink | Operational logs outside the transcript. |

## Related docs

- [Session API, events, and storage](session-api-events-and-storage.md)
- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Remote control and teleport](remote-control-and-teleport.md)
- [Runtime communication protocols](../00-start-here/runtime-communication-protocols.md)
- [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Conversation termination](../01-runtime-lifecycle/conversation-termination.md)
- [Observer agents](../06-agents-automation/observer-agents.md)