# Operations and native support mechanism question audit

This ledger records the full-analysis audit of mechanism-oriented documentation under `docs/05-hosted-agent-ops`. It is evidence for the edits, not a replacement for the narrative pages.

## Scope and exclusions

Audited pages:

1. [`architecture.md`](../05-hosted-agent-ops/architecture.md)
2. [`audio-capture-and-voice.md`](../05-hosted-agent-ops/audio-capture-and-voice.md)
3. [`audio-capture-native.md`](../05-hosted-agent-ops/audio-capture-native.md)
4. [`diagnostics-and-debug-logs.md`](../05-hosted-agent-ops/diagnostics-and-debug-logs.md)
5. [`image-processor-native.md`](../05-hosted-agent-ops/image-processor-native.md)
6. [`media-native-modules.md`](../05-hosted-agent-ops/media-native-modules.md)
7. [`safe-mode-and-recovery.md`](../05-hosted-agent-ops/safe-mode-and-recovery.md)
8. [`telemetry-and-tracing.md`](../05-hosted-agent-ops/telemetry-and-tracing.md)
9. [`updater-and-doctor.md`](../05-hosted-agent-ops/updater-and-doctor.md)

Excluded as audit targets: the section `README.md`, pure environment-variable/feature-gate inventories, shared navigation and indexes, other documentation sections, source artifacts, existing research ledgers, and `source-atlas/`. Those files were not changed by this audit.

## Artifact identity

The readable bundle identifies itself as:

| Field | Value |
|---|---|
| Package | `@anthropic-ai/claude-code` |
| Version | `2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Audit host | Linux x86-64 |

Hashes captured immediately before documentation edits:

| Artifact | SHA-256 |
|---|---|
| [`cli.js`](../../claude-code-pkg/src/entrypoints/cli.js) | `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` |
| [`cli.formatted.js`](../../claude-code-pkg/src/entrypoints/cli.formatted.js) | `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` |
| [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) | `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` |
| [`audio-capture.js`](../../claude-code-pkg/audio-capture.js) | `3d6b83c97b7cf53692407e85053262a1cffca44af3697bb0f5b46c18c500b420` |
| `audio-capture.node` | `185f990044394fbd4811284cfe9812d261453571c4dfbfa27dadd299c53036eb` |
| [`image-processor.js`](../../claude-code-pkg/image-processor.js) | `cdda6dcabf12ffd0f558e922fd268b3c21f92a6b869f806510338c25c51492ef` |
| `image-processor.node` | `37bec7de530676e3dfe963d34a824b49191595809a8072348a2ef4571f1e5f4d` |

The `.node` files are local extracted artifacts and are gitignored.

## Evidence and convergence rules

Evidence was ranked as follows:

1. Readable call paths and branch conditions in `cli.renamed.js` establish JavaScript-level orchestration.
2. The two retained JS shims establish the Bun/native loading boundary.
3. Exact-artifact export enumeration establishes callable N-API surface, not active use.
4. ELF dependencies, imported symbols, and embedded crate/version paths classify linked native capabilities, not execution order.
5. Safe runtime probes establish only what the exact artifact did on this host.
6. Native lifecycle, thread scheduling, cleanup order, and error propagation remain unknown unless a readable call path, disassembly, trace, or direct observation establishes them.

For each page, Round 1 asked between zero and ten questions that the existing narrative left unanswered or answered too strongly. The page was minimally corrected where the artifacts supplied an answer. A full Round 2 then reread the page against all gathered evidence. Convergence requires that Round 2 produce **zero new source-answerable mechanism questions**. Questions requiring unavailable native bodies or uninspected platform artifacts are retained as evidence limits rather than guessed answers.

## Per-page audit rounds

### `architecture.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| Is operations support a passive, observation-only periphery? | No. It includes observational routes, startup/network setup, foreground installation mutation, local persistence, and media preprocessing, although it does not own model-turn orchestration. | General initialization [`PgS()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930915); native installer around [`xFd()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L599700); image façade [`sharp()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L272868). | Replaced “passive periphery” with a mixed control/observation plane. |
| Does one gate control every operations surface? | No. First-party events, Datadog, OTel, error reporting, debug files, updater behavior, and media availability have separate predicates and lifecycles. | Analytics sink [`initializeAnalyticsSink()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L481301); third-party telemetry [`initializeTelemetryAfterTrust()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930979); debug writer around [`logForDebugging()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L24413). | Removed the universal-gate claim and named independent routes. |
| Is updater execution always out-of-band and nonblocking? | No. Periodic checks are scheduled outside a model turn, but foreground `update` and `install` await network and filesystem operations. | Updater UI around `cli.renamed.js:837500`; command registration around [`jkS()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L978600). | Distinguished scheduling from execution. |
| Do native-helper failures always degrade gracefully? | No universal rule exists. Recorder fallback is selected before capture; image fallback preserves only already-safe input; some failures surface errors. | Voice selection around `cli.renamed.js:611897`; image policy [`oit()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L279205). | Replaced the blanket failure claim with path-specific behavior. |

#### Round 2 — convergence

Zero new source-answerable questions. Remaining limits are the two native implementations, uninspected platform packages, and server-side telemetry/update services. **Status: converged.**

### `audio-capture-and-voice.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| What exact client audio contract is sent? | `linear16`, 16 kHz, one channel, 300 ms endpointing, and 1,000 ms utterance end. | [`connectVoiceStream()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L562440). | Added the wire-contract table. |
| What endpoint and control frames are used? | The client connects to `/api/ws/speech_to_text/voice_stream`, sends immediate and 8-second `KeepAlive` frames, and finalizes with `CloseStream`. | `cli.renamed.js:562461-562728`. | Added path, keepalive, and finalization details. |
| What happens to audio captured before the socket opens? | It is queued and coalesced into frames no larger than 32,000 bytes; live chunks are sent directly after readiness. | Voice `onReady` around `cli.renamed.js:872230`; replay around `cli.renamed.js:871860`. | Documented buffering and coalescing. |
| Is reconnect unbounded? | No. There is one early pre-transcript retry and one silent-drop replay path after a no-data finalization timeout. | `cli.renamed.js:872180-872220`; `cli.renamed.js:871820-871900`. | Added bounded resilience behavior. |
| Does a post-start native capture error automatically switch to another recorder? | No readable handoff establishes that. Backend choice happens before recording. | Recorder selection around `cli.renamed.js:611897`; voice start failure around `cli.renamed.js:872090`. | Narrowed fallback language. |
| How does text re-enter the product? | Final or salvaged transcript text is handed to the input callback; tap mode or `voice.autoSubmit` can subsequently submit it. | Transcript injection around `cli.renamed.js:871914-871932`; voice settings/caller path in the TUI. | Clarified that voice is dictation into the normal text pipeline. |

#### Round 2 — convergence

Zero new source-answerable questions. The service-side recognizer, endpoint implementation, and meaning of provider-specific options remain outside the client artifact. **Status: converged.**

### `audio-capture-native.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| What does the exact artifact export? | `startRecording`, `stopRecording`, `isRecording`, `startPlayback`, `writePlaybackData`, `stopPlayback`, `isPlaying`, and `microphoneAuthorizationStatus`. | Exact-artifact export enumeration; wrapper surface around `cli.renamed.js:562740`. | Recast the ABI table as observed surface rather than recovered bodies. |
| What does Linux authorization return? | This `2.1.215` Linux-x64 artifact returned `3`, contradicting the old “always `0`” statement. | Safe runtime probe of hash `185f9900…`; wrapper forwarder in `cli.renamed.js`. | Corrected the factual error and left numeric semantics unknown. |
| Is playback used by readable Claude Code code? | No downstream readable CLI call site was found for the playback wrappers; recording wrappers do have voice consumers. | Symbol/call-site searches for `startNativePlayback`, `writeNativePlaybackData`, and recording counterparts. | Marked playback as exported but not confirmed active. |
| Do ALSA imports prove the stream lifecycle and recovery order? | No. They prove linked capability, not which calls execute or their ordering. | `readelf`/`nm` evidence for the exact `.node` file. | Removed claims about dedicated threads, poll order, callback order, and pre-callback recovery. |
| Does a native mid-stream error prove fallback to `arecord`/SoX? | No. Readable selection occurs before recording; post-start handoff was not found. | Recorder selection and voice error paths in `cli.renamed.js`. | Removed the automatic-fallback claim. |

#### Round 2 — convergence

Zero new source-answerable questions. Native thread ownership, PCM configuration, callback scheduling, stop/drain ordering, authorization enum semantics, and cross-platform parity require disassembly/tracing or additional artifacts. **Status: converged with explicit native limits.**

### `diagnostics-and-debug-logs.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| How is the debug path chosen? | `--debug-file`, cached fallback, `CLAUDE_CODE_DEBUG_LOGS_DIR`, then `<claude-dir>/debug/<sessionId>.txt`. | [`getDebugLogPath()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L24439). | Added ordered path resolution. |
| Are entries redacted before persistence? | Yes. `Fc()` runs before the timestamped entry is enqueued. | Redactor [`Fc()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L23910); logger `cli.renamed.js:24413`. | Added entry lifecycle and level fallback. |
| What are buffering and exit semantics? | One-second interval, 100-entry maximum, immediate debug mode, serialized writes, async disposal, and a synchronous `exit` fallback. | Writer factory around `cli.renamed.js:24350-24410`. | Added writer lifecycle. |
| How does rotation work? | At more than 10 MiB, one `.1` generation is produced; rotation and `latest` symlink work are best-effort. | [`maybeRotateDebugLog()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L24295); `dbm = 10485760`. | Added rotation and non-durability caveat. |
| Where are detailed startup reports written? | `<claude-dir>/startup-perf/<sessionId>.txt` and `.json`; sampled startup telemetry can exist without those detailed files. | Profiler around [`profileReport()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L38340). | Added profiler artifacts and sampling distinction. |

#### Round 2 — convergence

Zero new source-answerable questions. Event-loop-stall thresholds and external error transport are separate mechanisms and are not inferred from the debug writer. **Status: converged.**

### `image-processor-native.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| What does the readable façade prove? | Lazy addon load, awaited `processImage`, queued `resize`/format operations, and `dispose()` in `finally` for `metadata()` and `toBuffer()`. | [`sharp()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L272868). | Added exact façade and cleanup behavior. |
| What is the high-level compression policy? | Preserve safe originals; try PNG level 9/palette; JPEG qualities 80/60/40/20; resize inside bounds; final width-1,000 quality-20 JPEG; preserve on failure only if header dimensions/base64 size remain safe. | [`oit()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L279205). | Added a seven-step source-confirmed policy. |
| Does Promise/Tokio/import evidence prove worker scheduling? | No. It proves an async JS contract and linked machinery, not where every decode/encode runs. | Exact-artifact `processImage()` probe; N-API imports and Tokio strings. | Replaced the asserted concurrency model with explicit limits. |
| Which unsupported format was directly observed? | GIF rejected with `The image format Gif is not supported`. | Safe runtime probe of hash `37bec7de…`. | Replaced broad format inference with the observed GIF result. |
| Do absent X11/Wayland dependencies prove Linux clipboard stubs? | No. Clipboard exports exist, but their implementation/result was not safely established. | ELF dependencies and export enumeration. | Marked clipboard behavior unknown. |

#### Round 2 — convergence

Zero new source-answerable questions. Native interpolation, memory ownership, scheduling/cancellation, clipboard behavior, and untested-format coverage remain evidence limits. **Status: converged with explicit native limits.**

### `media-native-modules.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| What do the retained JS files do? | Each is a Bun CommonJS shim requiring its matching `/$bunfs/root/*.node` addon. | [`audio-capture.js`](../../claude-code-pkg/audio-capture.js); [`image-processor.js`](../../claude-code-pkg/image-processor.js). | Kept the shim boundary explicit. |
| Which exported capabilities have readable consumers? | Image transformations and audio recording do; audio playback has no found downstream CLI consumer. | Image façade `cli.renamed.js:272868`; voice wrapper/call sites; playback symbol search. | Added consumer-level distinction. |
| Are the addons reverse-engineered end to end? | No. Hashes, dependencies, exports, selected observations, and JS consumers are known; native bodies are not. | Combined source, ELF, and runtime evidence. | Removed the contradictory “end-to-end” statement. |
| What may runtime probes establish? | Only exact-artifact, exact-environment observations, not portable contracts. | Inert audio queries and image Promise/GIF probes. | Added an evidence-ladder row and caveats. |

#### Round 2 — convergence

Zero new source-answerable questions. Native bodies and other-platform artifacts remain outside the evidence set. **Status: converged.**

### `safe-mode-and-recovery.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| How is safe mode resolved and propagated? | `xl()` checks `CLAUDE_CODE_SAFE_MODE` or pre-`--` `--safe-mode`; startup canonicalizes the env to `1` and disables CLAUDE.md. | [`xl()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L16252); startup around `cli.renamed.js:932411`. | Existing explanation retained and verified. |
| Which central customization categories are exceptions? | In `hvg`, only `hooks`, `statusLine`, and `fileSuggestion` are not immediately suppressed. | [`Yu()`/`hvg`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L260267). | Named the exact exception categories. |
| Do arbitrary values survive those exceptions? | No. Settings hooks reduce to policy hooks; status line and file suggestion resolve through managed policy. | [`Bzi()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L253950); `Bxt()`/`cQn()` nearby. | Clarified the managed-policy boundary. |
| Is every MCP config removed? | Ordinary discovery/config is suppressed, but dynamic startup input is filtered to `type === "sdk"`. | `D5f()` around `cli.renamed.js:931597`. | Clarified the host/SDK exception. |

#### Round 2 — convergence

Zero new source-answerable questions. The page now distinguishes user-facing “all customizations” shorthand from managed-policy and host-wiring exceptions. **Status: converged.**

### `telemetry-and-tracing.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| Do first-party events and third-party OTel initialize together? | No. First-party logging starts during `PgS()`; `initializeTelemetryAfterTrust()` separately initializes OTel/third-party providers. | [`PgS()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930915); [`initializeTelemetryAfterTrust()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930979). | Added route/initialization boundaries. |
| What happens with remote managed settings? | OTel waits for them, reapplies config env, captures admin steering state, reloads CA/mTLS, refreshes agents when needed, then initializes. | `cli.renamed.js:930979-931035`. | Documented the deferred path. |
| Does every `logEvent` fan out to 1P, Datadog, OTel, and BigQuery? | No. Generic analytics events route to sampled 1P and optionally Datadog. OTel call sites emit their own signals; BigQuery is a metric reader. | Analytics sink [`logEvent_2()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L481275); telemetry stack around `cli.renamed.js:554982`. | Corrected the universal fan-out claim. |
| What happens to OTel events before initialization closes? | The pending window is discarded as `not_configured` or `init_failed`; it is not an indefinite retry buffer. | [`tKa()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L931040). | Added bounded pending-event disposition. |
| Are debug, errors, and MCP logs the same sink? | No. Debug text and date-stamped error/MCP JSONL use distinct writers and registration paths. | `initializeErrorLogSink()` around `cli.renamed.js:596964`; debug writer around `cli.renamed.js:24350`. | Added a route table. |

#### Round 2 — convergence

Zero new source-answerable questions. Backend retention/query behavior and service-side schemas remain outside the local artifacts. **Status: converged.**

### `updater-and-doctor.md`

#### Round 1

| Question | Answer | Evidence anchors | Documentation edit |
|---|---|---|---|
| How does the npm/Bun global updater coordinate processes? | `<claude-dir>/.update.lock`, exclusive PID write, five-minute stale threshold, owner-only release; contention returns `in_progress`. | [`zXy()`/`KXy()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L597390); [`_Ot()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L597600). | Added the complete global-lock lifecycle. |
| How does the native installer avoid duplicate/racing work? | In-process calls share one promise; versions use PID locks; running versions retain lifetime locks; contention returns `lockFailed`. | `installLatest()` around `cli.renamed.js:600000`; version locks around `cli.renamed.js:599133`. | Added in-process and cross-process distinctions. |
| What happens before native activation? | Stream download, SHA-256 validation, staging, executable permissions, and bounded atomic-copy retries. | Native downloader/installer around `cli.renamed.js:598700-599900`. | Added staged integrity and retry steps. |
| Is the old launcher always preserved? | Only specific paths establish preservation/restoration. Unknown launchers are not overwritten; Unix uses symlink swap; Windows attempts restore after failed copy. No universal filesystem guarantee is proved. | Activation around `cli.renamed.js:599700-600000`; global Windows restore around `cli.renamed.js:597700`. | Narrowed preservation language. |
| Are all updater invocations nonblocking? | No. Periodic checks are scheduled, but foreground `update`/`install` await work. | Updater UI around `cli.renamed.js:837500`; command handlers around `cli.renamed.js:651500`. | Added foreground/background distinction. |
| Are `claude doctor` and `/doctor` the same mechanism? | No. The CLI handler reports read-only diagnostics; `/doctor` is the in-session repair-capable workflow subject to normal permissions. | Command description around [`jkS()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L978608); [`doctorHandler()`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L652504). | Expanded checks and corrected scope. |

#### Round 2 — convergence

Zero new source-answerable questions. Server release publication, every filesystem-specific failure, and unexecuted platform branches remain outside the evidence set. **Status: converged.**

## Final convergence result

A complete second pass over all nine edited pages produced **zero new source-answerable mechanism questions**. All pages are therefore complete under the stated artifact/evidence boundary.

The remaining unknowns are deliberate and non-source-answerable from this evidence set:

- internal native audio threads, ALSA call ordering, PCM parameters, stop/drain semantics, callback scheduling, and authorization-number semantics;
- active Claude Code use of native audio playback (no readable consumer was found);
- native image worker scheduling, cancellation, interpolation defaults, memory ownership, and clipboard behavior;
- macOS/Windows native parity for either addon;
- service-side voice transcription, telemetry ingestion/retention, and release publication behavior;
- updater guarantees under filesystem failures not represented by the traced recovery branches.

**Audit status: complete and converged for Claude Code `2.1.215` on the inspected Linux-x64 artifacts.**

## Built-in command follow-up — 2026-07-24

The broad command inventory found two diagnostics mechanisms that the original flag/writer audit did not describe:

- `/debug` is a user-only bundled skill. It turns logging on at invocation time, flushes the current writer, embeds only a bounded tail plus bounded daemon lock/status/log evidence, and states explicitly when pre-invocation events were never captured. Its model prompt pre-authorizes only Read/Grep/Glob.
- `/heapdump` is a hidden support command. It writes an owner-only V8 `.heapsnapshot` and a diagnostics JSON file to the Desktop when available or the home directory otherwise. The JSON separates JS heap from external/unaccounted native memory and includes V8 spaces, resource usage, active handles/requests, file descriptors, optional `/proc` data, JSC counts, and heuristic leak indicators.

`diagnostics-and-debug-logs.md` now owns both paths. Neither command is described as an external upload, automatic cleanup, or universal crash dump; those guarantees are absent from the retained client. The follow-up reread produced zero new source-answerable diagnostics-command questions. **Follow-up status: edited and converged.**
