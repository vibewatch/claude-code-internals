# Session and remote-control architecture

This page is the architecture analysis for the sessions/persistence/remote module. It complements the implementation pages by focusing on **what a session actually is, where state lives, how restore/fork/rewind compose, and which remote paths control a local envelope versus run a hosted one** rather than re-listing each flag.

Scope: durable JSONL transcripts, in-memory session envelope, resume/continue/fork/rewind flows, remote sessions, teleport, Remote Control, session API/event families, and storage seams. Implementation specifics live in [Session resume and transcripts](session-resume-and-transcripts.md), [Remote control and teleport](remote-control-and-teleport.md), and [Session API, events, and storage](session-api-events-and-storage.md).

## Module purpose

This module owns the **state plane** of the agent runtime. It treats a session as the unit of durability and the address of a runtime instance, and it makes that unit visible to:

1. Local persistence (JSONL transcripts under the Claude config directory).
2. CLI restore/fork/rewind paths.
3. Headless/SDK transports that need to refer to a session by ID.
4. Remote variants that either bridge a local envelope (Remote Control), operate a hosted session (`--remote`), or import hosted history into a local envelope (`--teleport`).

## Architecture thesis

A local session is a **two-layer object**: a durable transcript layer (`local-jsonl`) and a live runtime layer (the in-memory envelope). Both local layers use the same session UUID. Hosted and bridged paths add service-side identities (for example a Remote Control bridge-session ID) and replay cursors; those identifiers are related to the local UUID through transcript metadata, but they are not one universal key.

## Source anchors

| Semantic alias | String or symbol | Architectural meaning |
| --- | --- | --- |
| LocalJsonlTranscriptSource | `transcriptSource:"local-jsonl"` | Default classification of the durable layer. |
| ProjectSessionStoreRoot | `projects` | Config-root projects helper; addresses one project's session files. |
| SessionJsonlNamePattern | `${H}.jsonl` | Per-session filename pattern. |
| CurrentSessionFileResolver | `${v$()}.jsonl` | Current-session file resolver. |
| SessionDiscovery | `async function loadConversationForResume(H,$)` | Latest/resume discovery — turns CLI intent into a session target. |
| SessionRestore | `async function f7o(e,t,r)` | Restore — applies discovered state to the current in-memory envelope. |
| ContinueLatestFlag | `-c, --continue` | Resolve target = "latest in cwd." |
| ResumeSessionFlag | `-r, --resume [value]` | Resolve target = explicit ID, picker, or search. |
| ForkSessionFlag | `--fork-session` | Resume into a new session ID instead of mutating the original. |
| NoSessionPersistenceFlag | `--no-session-persistence` | Disables the durable layer for this run. |
| ResumeSessionAtGuard | `--resume-session-at requires --resume` | Headless restore-validation rule. |
| SessionIdPinFlag | `--session-id <uuid>` | Pin a specific session ID; intersects with `--continue`/`--resume` validation. |
| InteractiveResumePicker | `await aa4(Y7, ...)` | Interactive picker/search path called from the root action. |
| BridgeStateFrame | `enqueue({type:"system",subtype:"bridge_state",state:bH,detail:pH,...})` | Bridge-state frame used by remote variants. |
| TranscriptMirrorFrame | `transcript_mirror` | Carries entries to SDK/host mirror listeners only after the corresponding local append succeeds. |
| SessionStateFrame | `session_state_changed` | Idle/running/requires_action frame attached to the envelope. |
| RemotePermissionBridge | `createCanUseTool` | Permission bridge wired into remote/SDK transports. |
| OrderedTranscriptStore | `class ROd`, `drainQueuesOnce` | Per-file queues serialize append batches and UUID removals; SDK mirrors are emitted only after a successful local append. |
| MetadataCheckpoint | `bytesSinceMetadataReAppend`, `LITE_READ_BUF_SIZE / 2` | Re-appends cached current-session metadata after approximately 32 KiB of successful UTF-8 main-transcript writes. |
| TranscriptRelocation | `relocateSessionTranscript`, `beginTranscriptRelocation`, `mOd`, `cOd` | Globally buffers `ROd` entries and buffers auxiliary appends addressed to the exact old main JSONL while moving the main transcript and associated session directory. |
| RemoteHydration | `hydrateRemoteSession`, `hydrateFromCCRv2InternalEvents`, `.ccr-tip.json` | Reconciles server internal events into local JSONL by guarded replacement or an anchored delta. |
| PersistenceBackfill | `Epf`, `bpf`, `onTransportPersistenceReady` | Compares server UUIDs with local foreground/subagent suffixes and starts queuing missing local records before installing the live CCR writer. |
| BridgeResumeMetadata | `saveBridgeSession`, `lastSequenceNum` | Caches the hosted bridge ID and highest received numeric worker-SSE ID in memory; when the current transcript is materialized, queues a `bridge-session` append. |
| TranscriptRetentionSweep | `cleanupPeriodDays`, `async function kIp()` | Setting plus executable `mtime`-based cleanup sweep. |
| RetentionHousekeeping | `startBackgroundHousekeeping`, `.last-cleanup` | Process-local startup scheduler for transcript heartbeats and deferred retention work. |

## Internal decomposition

```mermaid
flowchart TD
    Cli[CLI flags + entrypoint env] --> Resolver[Session target resolver]
    Resolver -->|new| Fresh[Fresh session id]
    Resolver -->|latest| DiscoveryLatest[Latest-session discovery]
    Resolver -->|explicit / picker| DiscoveryExplicit[Explicit/search discovery]
    Resolver -->|--from-pr| DiscoveryExplicit
    Resolver -->|--teleport| Teleport[Hosted event fetch + local import]
    Resolver -->|--connect| DirectConnect[Direct Connect HTTP + WebSocket]
    Resolver -->|--remote| Hosted[Hosted Sessions V2 client]
    Resolver -->|--session-id| Pinned[Pinned id]

    Fresh --> Envelope[In-memory session envelope]
    DiscoveryLatest --> Restore[Session restore]
    DiscoveryExplicit --> Restore
    Pinned --> Restore
    Teleport --> Restore
    Restore --> Envelope

    Envelope --> Durable[Per-session JSONL transcript]
    Envelope --> Headless[Headless / SDK loop]
    Envelope --> TUI[Interactive TUI loop]
    Envelope --> LocalBridge[Remote Control<br/>local loop + hosted bridge]
    LocalBridge --> BridgeState[bridge_state]
    LocalBridge --> Permission[permission/control bridge]
    Envelope --> Mirror[transcript_mirror after local append]
    DirectConnect --> DirectSocket[Server-created session + WebSocket stream]
    Hosted --> HostedLoop[Hosted event loop]

    Durable -->|cleanup window| Retention[cleanupPeriodDays]
```

| Sub-component | Responsibility |
|---|---|
| Target resolver | Maps local selectors (`--continue`, `-r`, `--from-pr`, `--session-id`, picker) to restore targets and dispatches Direct Connect, teleport, hosted `--remote`, and Remote Control to their distinct transport/import paths. |
| `SessionRestore` | Applies already-discovered conversation, permission, model, agent, deferred-tool, worktree, and compatible bridge state to the envelope. |
| `SessionDiscovery` | Locates and loads "latest" or matching sessions from the project's JSONL directories, then normalizes the restore object. |
| Envelope | The live runtime view: session ID, working dir, model, permission mode, agent set, tool registry, hooks, and event sink. |
| Persistence sink | Queues records per file, appends ordered JSONL batches, then notifies mirrors; respects `--no-session-persistence`. |
| Bridge plane | Remote Control wraps a local envelope with bridge state, hosted identity, sequence replay, and remote permission flow. `--remote` and teleport have separate hosted-session clients. |
| `InteractiveResumePicker` | Interactive fallback when `--resume` value is ambiguous. |

## Public interface

### Inputs

| Surface | Effect |
|---|---|
| `--continue` / `-c` | Resolve to the most recent session in cwd. |
| `--resume [value]` / `-r` | Resolve by explicit ID, picker, or search term. |
| `--session-id <uuid>` | Pin an explicit ID; rejected with incompatible flags. |
| `--fork-session` | Resume into a new ID; durable history is preserved. |
| `--no-session-persistence` | Skip the durable layer; resume becomes unavailable. |
| `--resume-session-at <message id>` | Truncate restored history (headless only). |
| `--rewind-files <user-message-id>` | Restore files to a prior state and exit; no model turn. |
| `--from-pr <ref>` | PR-based resume path classified through the same resolver. |
| `--connect`, `--remote`, `--teleport`, `--remote-control` / `--rc` | Select distinct paths: Direct Connect creates and streams a server session, hosted remote owns a hosted loop, teleport imports hosted history into local restore, and Remote Control bridges a local envelope. |
| `cleanupPeriodDays` setting | Bounds the durable layer's retention window. |
| Managed setting `disableRemoteControl` | Blocks Remote Control activation at the policy boundary. |

### Outputs

| Output | Consumer |
|---|---|
| `${sessionId}.jsonl` | Local transcript reader, future `--continue`/`--resume`, exporter tools. |
| `transcript_mirror` frames | SDK/headless hosts and registered external-store mirror listeners. |
| `bridge_state` frames | Remote callers/UIs watching bridge connectivity. |
| `session_state_changed` frames | Hosts that drive long-running automation. |
| `permission_denied` / `can_use_tool` frames | Remote/host approval consumers. |
| Resume warnings (e.g. permission mode mismatch) | UI/UX surfaces. |

## Internal collaborators

| Collaborator | Contract |
|---|---|
| Runtime lifecycle | Produces the resolved target and hands the envelope to the chosen mode. |
| Context/model loop | Provides session events (messages, tool uses, results, errors) for the durable sink. |
| Tool/permission runtime | Persists tool-use lifecycle events and produces decisions remote consumers see. |
| Hooks subsystem | Receives `SessionStart`, `SessionEnd`, `PreCompact`, `PostCompact`, `Setup`. |
| MCP/plugins | Re-applied at restore time so the envelope reflects the same tools as the original session. |
| Telemetry/ops | Receives resume/restore/save events and shutdown signals. |
| Remote bridge | Uses envelope + bridge state to mediate with hosted services. |

## Design decisions

1. **The local UUID is canonical for local state, not every remote object.** `${sessionId}.jsonl` addresses the local transcript. Remote Control additionally persists a bridge-session ID and last sequence number; hosted sessions have service IDs that may later be teleported into a local session.
2. **Durable layer is append-oriented ordered JSONL, not a database.** `ROd` maintains per-file queues and drains them through a serialized chain. Its 100 MiB constant is a flush threshold over accumulated serialized JavaScript string length, not a byte-accurate record cap: an individual serialized record can exceed it and is still written whole. Most operations append, but queued UUID removal can truncate and rewrite a transcript in place. This establishes order within one process/file queue; the artifact exposes no cross-process file lock or transaction protocol.
3. **Restore reconstructs the *envelope*, not just history.** `SessionRestore` also re-applies permission mode, model, agents, and deferred tools so the resumed session behaves like its prior self.
4. **Fork is a first-class operation.** `--fork-session` separates "I want to continue" from "I want a divergent copy" so transcripts are not silently overwritten.
5. **Rewind is its own subcommand-like flag.** `--rewind-files` is a file-restore-only path that cannot run a turn; this prevents accidental model runs against an inconsistent file tree.
6. **No-persistence is opt-in, not the default.** Persistence by default keeps resume reliable; explicit opt-out exists for ephemeral pipelines.
7. **Remote surfaces are not interchangeable transports.** Remote Control drives a local loop through a resumable bridge. `--remote` drives a hosted session through its own SSE client. Teleport fetches hosted logs (with an endpoint fallback), validates repository compatibility, and resumes them locally. The Chrome `BridgeClient` is yet another transport used by browser tools.
8. **Picker is a UX fallback, not a separate path.** `InteractiveResumePicker` is invoked when resolver input is ambiguous; it ultimately returns into the same `SessionDiscovery`/`SessionRestore` flow.
9. **Retention is active lifecycle behavior.** The default is 30 days (minimum configured value: 1). The sweep compares filesystem `mtime`, removes stale transcripts, recordings and sidecars, and recursively cleans associated session/subagent/workflow/remote-agent state. It pauses when disabled or invalid settings sources make the configured period unknowable.

`startBackgroundHousekeeping()` is process-local and starts once. It schedules its first slow-work check after five seconds. In an interactive process, activity within the preceding minute defers that work by ten minutes; a `.last-cleanup` sentinel younger than 24 hours also moves the sweep to that ten-minute slow-work interval rather than running it at the first check. After `kIp()` returns, housekeeping rewrites the sentinel. Interactive housekeeping also touches the current transcript immediately and every hour, so an active transcript's `mtime` is refreshed independently of message writes. These timers are unreferenced and therefore do not keep the process alive.

## Persistence and reconciliation invariants

At architecture level, five ownership rules matter:

1. Main-transcript operations are ordered by one process-local per-file queue; this is not a cross-process lock or an atomic multi-record transaction.
2. A successful local append precedes SDK/session-mirror callbacks. Remote Control's CCR writer is a separate path invoked after enqueue and has its own acknowledgement lifecycle.
3. Shutdown drains admitted transcript work best-effort, but does not promise `fsync` durability.
4. Relocation coordinates the main JSONL and selected auxiliary appends while moving the main file and associated session directory independently; sidecars and direct associated-state writers are outside one all-files transaction.
5. Legacy hydration, CCR anchored hydration, and local-to-server backfill are reconciliation paths with separate guards and partial-failure boundaries, not ordinary local replay.

The exact queue timing, chunk/checkpoint thresholds, UUID-cache behavior, relocation fallbacks, hydration guards, and backfill admission limits are owned by [Session resume and transcripts](session-resume-and-transcripts.md#append-and-mirror-ordering) and [Remote control and teleport](remote-control-and-teleport.md#ccr-transcript-reconciliation-is-separate-from-sse-replay). Observable record/sidecar shapes remain in [Data models and frame schemas](data-models-and-frame-schemas.md).

## State plane

| Layer | Lifetime | Owner |
|---|---|---|
| Process argv/env | Process | Runtime lifecycle |
| Settings (user/project/local/managed) | User/process | Settings module |
| Live envelope (session ID, permissions, agents, tools, hooks, model) | Process | This module |
| Durable JSONL transcript | Across process restarts; subject to retention or explicit deletion | This module |
| Remote Control bridge state | Connection plus persisted bridge ID/highest received numeric SSE ID | This module + Remote Control transport |
| Hosted `--remote` state | Hosted session lifetime | Sessions API/SSE client |
| Telemetry/log files | Configured window | Ops module |

This separation is what lets resume, fork, and rewind operate without touching other modules' state.

## Failure modes

| Failure | Behavior |
|---|---|
| `--resume` value matches nothing | Picker fallback or precise error. |
| `--resume-session-at` without `--resume` | Headless validation rejects before any restore. |
| `--rewind-files` combined with a prompt | Rejected; rewind is a standalone operation. |
| Permission mode mismatch on resume | Warning is surfaced before the loop starts. |
| Disk full / JSONL write error | The drain logs the error and emits `tengu_transcript_write_failed`; queued callers are released and execution can continue, but those records may be absent from disk and mirrors. There is no source-visible automatic switch that disables all later writes. |
| Remote Control bridge disconnect | The worker SSE transport resumes after its highest received numeric ID, logs but still dispatches duplicate sequence IDs, refreshes/rebuilds selected credential failures, and exposes bridge-state changes. Separate bounded UUID rings suppress send-attempt echoes and type-accepted inbound `user` redelivery; eligible control frames route before that UUID check. |
| `--remote` disconnect | `SessionsV2Client` resumes by sequence but stops after five reconnect attempts; a `catch_up_truncated` event explicitly reports an unrecoverable transcript gap. |
| Managed policy changes | Static source proves activation gates. It does not prove that an already-running bridge is synchronously revoked when policy changes elsewhere. |
| Concurrent writers to the same session file | In-process queues serialize their own writes, but the artifact exposes no cross-process lock. Cross-process ordering and atomic multi-record semantics remain unspecified. |
| Transcript relocation failure | Buffered transcript writes replay in `finally`, but the auxiliary buffer covers only the exact old main JSONL; direct associated-tree and CCR-tip writers remain outside it. Main-file move, associated-directory move, relocation metadata, sidecar placement, and symlink repointing are independent. Partial relocation, split associated state, orphan tips, and duplicate copy/delete artifacts are not rolled back. |
| Remote hydration mismatch | Content-bearing local history is retained when the fetched foreground/subagent set has no `user` or `assistant` content. Other accepted full-hydration paths directly rewrite JSONL; delta mode depends on a locally validated tail anchor and falls back when coherence cannot be established. |
| Retention ambiguity | Cleanup is skipped when settings errors or disabled sources make `cleanupPeriodDays` unsafe to determine, favoring retention over accidental deletion. |

## Extension points

| Extension | How it plugs in |
|---|---|
| Additional resume source | Add another branch in the target resolver that produces a session reference; do not bypass `SessionRestore`. |
| New durable mirror | Implement the SDK `sessionStore` adapter. Local writes remain required by this artifact; use an ephemeral `CLAUDE_CONFIG_DIR` if local residue is undesirable. |
| New remote transport | Specify whether it controls a local envelope or owns a hosted loop; do not assume Remote Control, Sessions V2, teleport, and Chrome bridge semantics are interchangeable. |
| Custom retention policy | Extend the cleanup implementation and its settings-safety gates, not just the schema. |
| Hook into restore | Use `SessionStart` / `Setup` hooks rather than wrapping `SessionRestore`. |

## Caveats

- The exact set of fields restored by `SessionRestore` is implementation-defined; this page documents observable categories. Saved permission/model/agent values are transitioned through current availability and policy checks rather than copied unconditionally.
- Server-side replay retention, bridge-session retention, compatibility across versions, and hosted transaction guarantees are not established by the static client artifact.
- A persisted worker-SSE cursor is receipt state, not proof that the corresponding payload parsed, passed attestation filtering, or reached the application callback. `saveBridgeSession()` updates the in-memory bridge cache immediately but queues a transcript record only when a session file is materialized; metadata re-append can persist that cache later. The visible background-job snapshot is written during rendezvous shutdown rather than after every frame.
- Remote Control, hosted Sessions V2, teleport, and the Chrome browser-tool bridge share some vocabulary but have distinct lifecycles; their differences are documented in the implementation page.
- The Anthropic SDK bundle contributes many `session_id`/`/v1/sessions/...` strings that are unrelated to Claude Code's local session module; this page only describes the local module.

## Related docs

- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Remote control and teleport](remote-control-and-teleport.md)
- [Session API, events, and storage](session-api-events-and-storage.md)
- [System architecture](../00-start-here/system-architecture.md)
- [Runtime lifecycle architecture](../01-runtime-lifecycle/architecture.md)
- [Context and model loop architecture](../02-context-model-loop/architecture.md)
- [Tool runtime and security architecture](../03-tools-integrations-security/architecture.md)
