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
| SessionDiscovery | `async function jHH` | Resume/latest-session discovery. |
| TranscriptRestore | `async function OG8` | Transcript restore into the live envelope. |
| TranscriptRecorder | `recordTranscript` | Durable transcript append/export surface. |
| FileHistorySnapshotRecorder | `recordFileHistorySnapshot` | File-history snapshot storage. |
| ContextCollapseSnapshotRecorder | `recordContextCollapseSnapshot` | Context-collapse snapshot storage. |
| SdkSessionStoreAdapter | `sessionStore` | SDK/external storage adapter hook. |
| SessionStateFrame | `session_state_changed` | Runtime/session state stream frame. |
| TranscriptMirrorFrame | `transcript_mirror` | Transcript mirror stream frame. |
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
| Session identity | Session UUID, JSONL filename, optional alias/name. | Stable address for local, resumed, forked, and remote-projected state. |
| Durable transcript | User/assistant messages, tool use/results, hook/event records, context-collapse records. | Append and replay history for restore/continue/fork. |
| Live envelope | Model state, cwd, permission mode, visible tools, hooks, agents/tasks, bridge state. | Process-time runtime state rebuilt from flags/settings/transcript. |
| Metadata/index | Title/summary, cwd, git branch/tag, timestamps, alias records. | Session picker, latest-session discovery, and restore metadata. |
| File/checkpoint state | File-history snapshots, leaf checkpoints, context-collapse snapshots. | Rewind and checkpoint restore. |
| External mirror | `sessionStore`, `transcript_mirror` frames. | Optional SDK/external mirroring fed by local persistence. |

## Transcript record families

| Record family | Typical contents | Owner |
|---|---|---|
| Message records | Role, content blocks, model/tool-use IDs, timestamps. | Session transcript and context restore. |
| Tool records | Tool name, tool input/result, errors, permission/denial metadata. | Tool execution and permission pages. |
| Hook/event records | Hook name, event input/output, decision or observation metadata. | Hook runtime and audit trail. |
| File-history records | Paths, snapshots, checkpoint IDs, restore metadata. | Rewind/checkpoint mechanics. |
| Context-collapse records | Summary/replacement metadata, token-savings metadata, commit records. | Context compaction. |
| Sidechain/subagent records | Parent session ID, task/subagent transcript linkage. | Agent/task runtime. |
| Queue/control records | Pending task/control operations and bridge messages. | SDK/remote/task control plane. |

## Stream and control frame families

| Frame or subtype | Direction | Observable role |
|---|---|---|
| `session_state_changed` | runtime → SDK/host | Session state changed. |
| `transcript_mirror` | runtime → SDK/external store | Local JSONL line mirrored outward. |
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

## Remote/session storage areas

| Storage area | Evidence | What is stored |
|---|---|---|
| Project/session transcripts | `projects`, `` `${sessionId}.jsonl` ``, `recordTranscript` | Append-only JSONL transcript and session records. |
| Session metadata/index | `listSessions`, `getSessionInfo`, alias/metadata restore helpers | Picker/latest-session metadata. |
| File history/checkpoints | `recordFileHistorySnapshot`, checkpoint/rewind surfaces | Snapshots used for rewind and restore. |
| Context-collapse data | `recordContextCollapseSnapshot`, collapse commit/replacement records | Compaction metadata and summary replacement records. |
| Sidechain/subagent transcripts | sidechain/subagent transcript loaders | Subagent/task history separate from the main transcript view. |
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