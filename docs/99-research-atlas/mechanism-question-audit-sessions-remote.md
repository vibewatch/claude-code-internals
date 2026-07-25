# Sessions, persistence, and remote mechanism question audit

This research ledger records the full-analysis audit of the mechanism-explaining pages in `docs/04-sessions-persistence-remote/`, excluding the section `README.md`. It tracks the questions used to test each page, the source answer, the documentation change, and the residual boundary where the retained artifact cannot answer safely.

## Scope and constraints

Audited pages:

1. `architecture.md`
2. `data-models-and-frame-schemas.md`
3. `hosted-projects-and-knowledge.md`
4. `remote-control-and-teleport.md`
5. `sdk-query-and-session-api.md`
6. `session-api-events-and-storage.md`
7. `session-recording.md`
8. `session-resume-and-transcripts.md`
9. `team-onboarding-and-share-flows.md`

The audit asked mechanism questions in seven dimensions: **identity, ordering, persistence, reconnect/recovery, failure, cleanup, and edge cases**. The mechanism-page pass did not edit section `README.md` files, source artifacts, or other research ledgers. Shared research navigation was connected only after all six domain ledgers converged. `data-models-and-frame-schemas.md` was limited to append/mirror lifecycle, `bridge-session` persistence fields, and sequence/reconnect notes.

## Artifact identity and provenance

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code@2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Primary readable artifact | `claude-code-pkg/src/entrypoints/cli.js` |
| Primary SHA-256 | `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` |
| Normalized view | `cli.formatted.js` — `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` |
| Semantic-alias view | `cli.renamed.js` — `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` |

The three JavaScript files are **not independent corroborating binaries**. `scripts/normalize-cli-js.mjs` stitches/decodes/formats `cli.js` into `cli.formatted.js`; `scripts/semantic-rename-cli.mjs` applies scope-aware, evidence-backed aliases to that normalized view. Assertions were traced to enclosing call paths in the readable semantic view and checked against raw/formatted views when text transformation could matter. In particular, the recording-module negative finding was searched across all three views, but that counts as cross-view confirmation of one artifact, not three sources.

`source-atlas/` was intentionally left untouched: this was a docs-and-readable-artifact reconstruction, and no atlas regeneration or package extraction was needed.

## Question and convergence method

For each page:

1. Read the existing page and neighboring session/remote pages.
2. Turn every mechanism claim into concrete questions across the seven dimensions.
3. Trace each answer through an enclosing implementation path rather than relying on one string hit.
4. Edit only source-answerable omissions or overclaims; label service-side and missing-artifact behavior unknown.
5. Re-read the edited page and ask the same question families plus questions introduced by the new prose.
6. Stop only after one complete page pass produces **zero new source-answerable questions**.

“Zero new questions” does not mean every product behavior is known. It means remaining questions require server implementation, a missing bootstrap/native layer, runtime observation, or a future artifact and are stated as limitations rather than guessed.

## Cross-cutting answers

| Question | Source answer | Representative anchors |
|---|---|---|
| Is one ID used for every local and remote object? | No. Local transcript/envelope state uses a session UUID. Remote Control adds a hosted bridge-session ID and sequence cursor; hosted sessions use service IDs that teleport can import locally. | `saveBridgeSession` [~581,893](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581893), bridge record parse [~582,736](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L582736) |
| What orders transcript writes? | `ROd` queues by target file and chains drains. Auxiliary writers use a separate per-file serial executor. This proves in-process ordering, not a cross-process lock. | `class ROd` [~579,533](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579533), `drainQueuesOnce` [~579,659](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579659), `appendEntryToFileAsync` [~581,746](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581746) |
| When is an SDK/external mirror notified? | After the corresponding local append succeeds. The parent SDK batcher is a second persistence stage with independent timeout/retry/failure behavior. | `fireMirror` after `appendToFile` [~579,659](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579659), `TranscriptMirrorBatcher` [~609,449](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L609449) |
| What happens on local write failure? | The runtime logs/telemeters failure and resolves remaining waiters in that drained batch so execution can continue. The failed chunk is not mirrored; later persistence is not globally disabled by this path. | `drainQueuesOnce` catch [~579,704](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579704) |
| Is retention only a schema setting? | No. `kIp()` runs an `mtime`-based sweep over transcripts, cast files, sidecars, and associated recursive state, with conservative settings-error gates. | `async function kIp()` [~746,352](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L746352) |
| Do all remote modes share one reconnect implementation? | No. Remote Control worker SSE, hosted `SessionsV2Client`, teleport polling/import, Direct Connect WebSocket, and Chrome browser-tool bridge have distinct identities and recovery contracts. | Remote Control [~417,160](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417160), hosted client [~853,215](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853215), Direct Connect [~610,980](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L610980) |
| What does coordinated shutdown guarantee? | It drains registered append/buffer work best-effort and tears down transports/processes. The source does not prove `fsync`, success under abrupt kill, or server erasure after archive/delete. | `flushSessionStorageAtExit` [~579,483](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579483), SDK cleanup [~608,555](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L608555) |

## Per-page rounds

### `architecture.md`

**Round 1 questions**

- Does the local UUID also identify hosted and bridged objects?
- Is “remote” one transport plane?
- Is append-only enough to explain ordering and mirroring?
- Does a write failure disable persistence for the run?
- Is retention declarative or executable?
- Are policy-change revocation and single-writer guarantees source-proven?

**Answers and anchors**

- Local and bridge identities are linked but distinct: `saveBridgeSession` persists `bridgeSessionId` and `lastSequenceNum` [~581,893](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581893).
- Remote Control worker SSE resumes/deduplicates [~417,160-417,434](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417160); hosted `--remote` has a separate finite-budget client [~853,215-853,550](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853215); Direct Connect begins at [~610,980](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L610980).
- `ROd` establishes queued local append → mirror ordering [~579,533-579,739](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579533).
- Retention is implemented by `kIp()` [~746,352](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L746352).

**Documentation result**

Replaced the universal-ID/universal-remote model; added write/mirror/shutdown ordering, best-effort failure, active cleanup, cross-process caveat, and current-policy restore framing.

**Round 2 result**

A full reread found no new source-answerable mechanism question for this page. The final wording consistently separates local/hosted/bridge identity, SDK mirror ordering from CCR persistence, the two relocation buffers from unbuffered associated-state writers, and worker-SSE receipt state from persistence acknowledgement.

**Status:** converged.

### `hosted-projects-and-knowledge.md`

**Round 1 questions**

- What are startup injection and normal operation timeouts?
- Which failures degrade and which propagate?
- Are requests retried?
- Is document replacement atomic on both routes?
- Can concurrent tool calls safely replace the same document?

**Answers and anchors**

- `getProjectContextBlock` has a five-second wrapper [~267,743](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267743); project transport requests use 30 seconds in the same module.
- Non-2xx responses become `ProjectsApiError`; no general project retry loop is visible. Knowledge search `403` is the explicit fallback to document names with `rag: false`.
- Dispatcher `Aty` [~412,301](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412301) uses direct `PATCH` on the organization route but CCR delete then create; the tool descriptor [~412,606](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412606) is not concurrency-safe.

**Documentation result**

Added timeout/failure boundaries, the sole search fallback, non-atomic CCR replacement, no rollback, and concurrency caveats.

**Residual unknowns**

Server versioning, conflict detection, consistency, and retention are not exposed.

**Round 2 questions**

- Can two different remote object IDs map to the same large-read spill path?
- Is successful `/proc/self/fd/<fd>` resolution mandatory for a local-file upload to proceed?

**Answers and anchors**

- `Ety()` replaces every character outside `[a-zA-Z0-9-]` with `_`, so the filename mapping is not injective; distinct IDs can collide at `project-doc-<sanitized-id>.txt` [~412,260](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412260).
- `bty()` treats `/proc/self/fd/<fd>` realpath failure as `null` and continues. It still requires a fresh canonical-path and device match, and compares inode when the opened inode is nonzero [~412,170-412,255](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412170).

**Documentation result**

Added spill-name collision behavior and made the upload guard's optional descriptor-containment check versus mandatory path/device/conditional-inode checks explicit.

**Round 3 result**

The post-edit reread produced zero new source-answerable mechanism questions.

**Status:** converged.

### `remote-control-and-teleport.md`

**Round 1 questions**

- Which loop is local versus hosted for each entrypoint?
- Which identity and replay cursor survive resume/fork?
- How are duplicates, liveness loss, credentials, finite retries, and catch-up gaps handled?
- What stops teleport polling?
- What cleanup/archive action occurs and what does it guarantee?
- Is Chrome `BridgeClient` the Remote Control transport?

**Answers and anchors**

- Remote Control worker transport stores/restores sequences, sends query/header replay cursors, deduplicates recent IDs, and reconnects [~417,160-417,434](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417160); setup/reattach is `Qms`/`z6u` [~417,645](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417645).
- Hosted `SessionsV2Client` has five reconnect attempts and `catch_up_truncated` [~853,215-853,550](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853215).
- Teleport fetch fallback and wait path are [~336,767](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L336767) and [~336,828](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L336828); polling/archive are [~180,095](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L180095) and [~180,156](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L180156).
- Chrome `BridgeClient` is a browser-tool WebSocket subsystem, not either session SSE client.

**Documentation result**

Separated all transport families; added persisted sequence identity, replay/dedup/liveness, credential rebuild, hosted retry exhaustion/gap behavior, teleport stop rules, archive/handoff semantics, and Chrome scope correction.

**Residual unknowns**

Server replay retention, archive erasure/retention, short-code expiry, and cross-version compatibility.

**Round 2 question**

- How does hosted `SessionsV2Client` bound the request IDs it uses to reject forged/non-worker responses to its own control requests?

**Answer and anchors**

`sendControlRequest()` inserts each generated ID before the asynchronous POST completes. Worker responses delete matching IDs; once the insertion-ordered set exceeds `Rqb = 500`, the oldest retained unanswered ID is evicted. No immediate removal is wired to POST failure or the manager's request timeout in this class [~853,420-853,755](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853420).

**Documentation result**

Documented the 500-entry provenance-filter boundary, insertion/removal ordering, and why eviction weakens recognition of a sufficiently late non-worker response without making the set a complete pending-request ledger.

**Round 3 result**

The post-edit reread produced zero new source-answerable mechanism questions.

**Status:** converged.

### `sdk-query-and-session-api.md`

**Round 1 questions**

- Can `sessionStore` eliminate local writes?
- What batches, times out, retries, and reports an external-store failure?
- How does external-store resume reach a subprocess and clean up?
- What methods are required/optional?
- What is the exact import signature?
- Does Direct Connect support Unix sockets or reconnect?
- How are warm-query/process resources closed?

**Answers and anchors**

- Query setup rejects `sessionStore` with `persistSession: false` [~611,584](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611584); the parent/child config path must match [~611,600](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611600).
- `TranscriptMirrorBatcher` uses 500-entry/1-MiB thresholds, a 60-second timeout, and 200/800-ms retry delays [~609,449-609,552](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L609449).
- External resume materializes a temporary local config/transcript tree and cleans it after child exit around startup [~611,850](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611850).
- `InMemorySessionStore` is an external adapter implementation [~58,174](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L58174).
- The signature is `importSessionToStore(sessionId, store, options?)` [~611,967](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611967).
- `parseDirectConnectUrl` rejects `cc+unix://`; `DirectConnectTransport` has no reconnect loop [~610,980-611,180](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L610980).
- SDK cleanup flushes the mirror, rejects pending work, closes transports, and bounds child termination [~608,555](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L608555).

**Documentation result**

Corrected no-disk and Unix-socket claims; documented local staging, batching/retry/error ordering, adapter capability behavior, import signature, Direct Connect failure contract, and cleanup bounds.

**Residual unknowns**

Direct Connect server lifetime/auth/storage and exactly-once behavior for ambiguous adapter calls.

**Round 2 result**

A full reread found no new source-answerable mechanism question. It confirmed the external-store local-staging requirement, batch thresholds and timeout-specific retry behavior, non-transactional import ordering, Direct Connect fragment/close behavior, and best-effort deletion boundary.

**Status:** converged.

### `session-api-events-and-storage.md`

**Round 1 questions**

- Does the reference page preserve the same identity/order/failure model as the focused pages?
- Does it treat cleanup as running code?
- Does it distinguish bridge, hosted, teleport, Direct Connect, and browser transports?

**Answers and anchors**

The cross-cutting answers above apply: `ROd` [~579,533](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579533), `kIp` [~746,352](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L746352), Remote Control [~417,160](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417160), and hosted client [~853,215](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853215).

**Documentation result**

Changed the mental model to queue → local append → mirror → replay, made retention executable, separated identities/transports, and added cross-process/server-guarantee limits.

**Round 2 result**

A full reread found no new source-answerable mechanism question. The synthesis remains consistent with the focused pages without importing transport-specific guarantees into the common session model.

**Status:** converged.

### `session-recording.md`

**Round 1 questions**

- What activates the recorder and initializes its path/timestamp?
- What exactly is captured and in what order?
- Are buffer thresholds bytes?
- Which function flushes on rename/shutdown?
- What permissions are guaranteed for a pre-existing file?
- How are old casts cleaned up?

**Answers and anchors**

- The helper module exposes installer/flush/list/rename/reset [~859,952-860,080](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L859952), but no call to `installAsciicastRecorder`, no non-null `mfe.filePath` assignment, and no nonzero `mfe.timestamp` assignment is visible across the three derivative views. `CLAUDE_CODE_TERMINAL_RECORDING` exists only as an environment-schema surface in the retained readable artifact.
- Installed behavior is stdout and resize capture, ordered chained appends, timer/count/string-length thresholds, and a registered disposer [~860,015](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L860015). `E5t` increments by `m.length` [~4,292](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L4292).
- Rename directly calls the underlying `Hvn?.flush()` [~859,987](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L859987); no caller of the exported wrapper was found. Shutdown calls `dispose`, which drains and restores stdout.
- Header creation requests mode `0o600`; it does not chmod a pre-existing file.
- `kIp()` removes stale `.cast` files [~746,352](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L746352).

**Documentation result**

Reframed the page as a source-visible helper, added resize/disposal/retention and precise buffering behavior, and removed unsupported activation, timestamp, direct-flush-call, and permission overclaims.

**Residual unknowns**

Activation, initial path, filename timestamp clock/meaning, and abrupt-termination behavior.

**Round 2 question**

- Does rename recompute the active recording source and target after awaiting the recorder flush?

**Answer and anchors**

No. `renameRecordingForSession()` snapshots the current source path and computes the target from the then-current cwd/session ID before `await Hvn?.flush()`. It renames those snapshots and, on success, unconditionally stores the snapshotted target as the global path [~859,987-860,012](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L859987).

**Documentation result**

Added the stale-identity race across the awaited flush while retaining the already-documented late-buffer append race and unknown activation boundary.

**Round 3 result**

The post-edit reread produced zero new source-answerable mechanism questions.

**Status:** converged.

### `session-resume-and-transcripts.md`

**Round 1 questions**

- What exactly qualifies as latest/visible and how are live sessions filtered?
- Does resume concatenate physical JSONL order or reconstruct a branch?
- What happens with missing, cyclic, or absent parent links?
- What ordering/failure semantics apply to writes?
- Which saved model/permission/agent/worktree/bridge fields survive current policy and fork?

**Answers and anchors**

- Discovery/filtering is `loadConversationForResume` [~335,407](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L335407) plus picker enrichment filters [~583,900](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L583900).
- `buildConversationChain` walks `parentUuid`, detects cycles, and can use a narrow timestamp fallback [~581,220](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581220); `warnIfTranscriptUnchained` explains dropped unlinked records [~581,248](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581248).
- Write ordering/failure is `ROd` [~579,533](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579533) and `appendEntryToFileAsync` [~581,746](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581746).
- Restore compatibility and fork stripping are in `f7o` [~860,505](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L860505) and its model/permission/agent helpers immediately above.

**Documentation result**

Added exact latest/picker filtering, branch reconstruction and partial-chain behavior, write/mirror/failure/shutdown order, and current-policy/fork compatibility.

**Residual unknowns**

Cross-process write order, durable-sync semantics, and server replay compatibility.

**Round 2 result**

A full reread found no new source-answerable mechanism question. Direct inspection reconfirmed that missing/cyclic parents invoke the same-sidechain, closest-earlier, five-second timestamp fallback inside `buildConversationChain`; it is not an unexplained enclosing-loader behavior.

**Status:** converged.

### `team-onboarding-and-share-flows.md`

**Round 1 questions**

- Does the usage scanner call the canonical meaningful-message parser?
- How are files/descriptors bounded and selected?
- How are exact versus latest guides selected?
- Is update/create atomic or retried?
- What happens when a short code is absent, stale, or concurrent?

**Answers and anchors**

- `lDd` is a regex/newline scanner with a narrow string-content first-message rule, 50-MiB file cap, 200-character text cap, and 60-descriptor weighted cap [~564,040](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L564040). `dVy` forms the bounded aggregate [~564,185](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L564185).
- CRUD wrappers `Gzu`/`Ths`/`Wzu`/`whs` make one 10-second request each [~422,673](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L422673).
- `ShareOnboardingGuideTool` performs exact/latest lookup, local-file branching, update or create, and declares itself not concurrency-safe [~422,799](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L422799).

**Documentation result**

Corrected descriptor semantics, documented selection/ordering/no-retry/concurrency behavior, and retained service-side short-code semantics as unknown.

**Residual unknowns**

Expiry, visibility/access propagation, delete retention, and server conflict handling.

**Round 2 result**

A full reread found no new source-answerable mechanism question. The scanner's stat/read and symlink boundaries, descriptor cap/selection, share-file race, exact/latest guide selection, and non-atomic update/create behavior are all explicit.

**Status:** converged.

### `data-models-and-frame-schemas.md`

**Round 1 questions**

- Which fields make up the persisted bridge link?
- When is `transcript_mirror` emitted relative to local persistence?
- Which sequence/reconnect statements are common versus transport-specific?

**Answers and anchors**

- `bridge-session` write/clear/current-state helpers are [~581,893-581,945](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L581893); metadata re-append includes optional dialog kinds/grouping [~579,900](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579900); loader behavior is [~582,736](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L582736).
- Local append precedes mirror in `ROd` [~579,659](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L579659).
- Worker SSE and hosted Sessions V2 have separate sequence/reconnect paths [~417,160](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L417160), [~853,215](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L853215).

**Documentation result**

Added only the permitted lifecycle/schema material: bridge fields and tombstone behavior, append-before-mirror semantics, and transport-specific replay/reconnect notes.

**Round 2 result**

A full reread found no new source-answerable mechanism question within this schema-focused page's scope. Bridge tombstones/grouping, append-before-mirror ordering, metadata checkpoints, and transport-specific cursor/reconnect semantics remain consistent with the focused implementation pages.

**Status:** converged.

## Artifact-limited questions retained explicitly

- What code initializes asciicast `filePath`/`timestamp`, and does `CLAUDE_CODE_TERMINAL_RECORDING` reach it in the distributed CLI?
- What are service-side replay windows, short-code expiry/access rules, archive/delete retention, and erasure semantics?
- Are remote events delivered exactly once, and how are cursor formats migrated across versions?
- What conflict/versioning guarantees do hosted Projects and onboarding-guide APIs enforce?
- What ordering results when multiple OS processes append the same local transcript?
- Do successful appends survive power loss (`fsync`/filesystem semantics), and which cleanup hooks run under abrupt termination?

These remain unknown because answering them requires unavailable server implementation, an absent bootstrap/native activation path, or runtime/filesystem observation. They were not converted into assumptions.

## Final convergence and validation

The first post-edit pass exposed three narrow residual mechanisms: non-injective Projects spill filenames plus the optional `/proc` guard, hosted request-ID filter eviction, and recording rename identity captured before an awaited flush. Those answers were added to their owning pages. A subsequent complete pass over all nine pages produced **zero new source-answerable mechanism questions**.

| Page | Final pass: new source-answerable questions | Status |
|---|---:|---|
| `architecture.md` | 0 | Converged |
| `hosted-projects-and-knowledge.md` | 0 | Converged |
| `remote-control-and-teleport.md` | 0 | Converged |
| `sdk-query-and-session-api.md` | 0 | Converged |
| `session-api-events-and-storage.md` | 0 | Converged |
| `session-recording.md` | 0 | Converged |
| `session-resume-and-transcripts.md` | 0 | Converged |
| `team-onboarding-and-share-flows.md` | 0 | Converged |
| `data-models-and-frame-schemas.md` | 0 | Converged |

Cross-page terminology now consistently preserves these boundaries:

- local JSONL identity versus Remote Control bridge identity versus hosted-session identity;
- local append/SDK mirror ordering versus independently acknowledged CCR persistence;
- numeric SSE receipt cursors versus bounded UUID/request-ID application filters;
- cooperating transcript relocation buffers versus unbuffered associated-state and sidecar writers;
- hydration replacement/delta policy versus local-to-server scheduled backfill;
- external session-store mirroring versus mandatory local subprocess staging;
- source-visible recording helpers versus the absent activation/initializer path;
- client-side file/path guards versus server consistency, retention, and conflict guarantees.

Final repository-wide validation produced these results:

| Check | Result |
|---|---|
| Exact mechanism-page coverage | All 53 classified mechanism pages were assigned exactly once across the six domain ledgers: 10 runtime, 8 context/model, 10 tools/security, 9 sessions/remote, 9 operations/native, and 7 agents/automation. |
| Per-round question limit | 112 page/round records were checked; the largest round contained 10 questions, so every page stayed within the requested maximum. |
| Final convergence markers | All six ledgers state a zero-new-question final pass; no unresolved convergence placeholder or pending final-table cell remains. |
| Shared navigation | All six ledgers are linked from the research-atlas index, `docs/SUMMARY.md`, and the Astro/Starlight sidebar. |
| Relative Markdown targets | 2,911 relative file targets were checked across `docs/`; hand-authored documentation had zero unresolved targets. Two unresolved references occur only inside excluded extracted prompt prose and point to upstream files not retained in this repository. |
| Editor diagnostics | No errors were reported for the final edited documentation and navigation files. |
| Whitespace | Repository-wide `git diff --check` passed. |
| Documentation build | Astro loaded 88 documentation sources and generated 89 static pages, including all six audit routes. Pagefind and sitemap generation completed. The only warning was Vite's non-fatal existing advisory for chunks larger than 500 kB after minification. |
| File accounting | The final working tree contains 26 tracked modified paths and two new ledger files. No path under `claude-code-pkg/` or `source-atlas/` changed. |

**Audit status: complete, validated, and converged for all 53 mechanism pages against Claude Code `2.1.215` and the inspected retained artifacts.**

## Built-in command follow-up — 2026-07-24

The complete command audit added a focused lifecycle round to `session-resume-and-transcripts.md`:

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does `/clear` delete the old transcript? | No. It runs `SessionEnd(clear)`, separates retained background work from foreground tasks, clears transient state, emits `conversation_reset`, resets costs/metadata, regenerates the session ID with a parent link, and starts the new transcript. The old file remains resumable. | Added ordering, task, title, cwd, and budget-reset behavior. |
| Is `/branch` just `--fork-session` under another name? | No. It physically selects UUID records from the current JSONL, rewrites session/parent/fork provenance, copies replacement/relocation records, picks a collision-free branch title, and can immediately resume the new file. | Added the branch writer lifecycle. |
| How does argumentless `/rename` choose a name? | It uses a one-turn no-tool helper: a warm-cache fork when eligible, otherwise a structured request over a bounded conversation tail. Explicit names persist directly and add a model-visible naming reminder. | Added generation, persistence, teammate, and bridge boundaries. |
| Does `/recap` compact or persist a summary? | No. It runs a disposable one-turn no-tool fork with cache writes/transcript disabled and returns a one- or two-sentence recap. It can rebuild reduced cache-safe parameters when needed. | Added the explicit/away-summary and error branches. |

A final remote-command round distinguished three superficially similar UI entries:

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is `/remote-env` only a picker? | No. It lists first-party environments, derives the effective setting by source precedence, clears an existing local override, writes the user default ID, and warns when a higher-precedence source still wins. | Added API, persistence, precedence, and failure behavior. |
| Does `/web-setup` only open an OAuth page? | No. When `gh` is authenticated, it wraps the local token against accidental string/JSON inspection, warns before replacing GitHub App OAuth, explicitly confirms, imports the token to the hosted endpoint, and best-effort creates a first default environment. | Added credential-transfer, consent, error, cancellation, and environment-bootstrap boundaries. |
| Does `/session` mutate or attach the hosted session? | No. It reads `remoteSessionUrl`, renders a text URL and optional QR code, suppresses QR rendering for screen readers, and logs/omits failed QR generation. | Classified it as a read-only remote-mode display. |

The follow-up reread found no additional session-lifecycle command with an undocumented persistence transition; `/copy`, `/export`, and the remaining UI-only selectors stay cataloged without being misrepresented as transcript storage mechanisms. **Follow-up status: edited and converged.**
