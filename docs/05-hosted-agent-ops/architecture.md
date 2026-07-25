# Operations and native-support architecture

This page is the architecture analysis for the hosted-agent-ops module. It complements the implementation pages by focusing on **how diagnostics, telemetry, the enterprise gateway, updates, and native helpers are invoked around and alongside the main runtime without owning the local agent loop** rather than re-listing each event name.

Scope: debug logs, telemetry/traffic gates, feature flags, the native-only enterprise gateway server, doctor/update tooling, crash and error reporting, hosted review signals, and embedded image/audio native helpers. Implementation specifics live in [Diagnostics and debug logs](diagnostics-and-debug-logs.md), [Telemetry and tracing](telemetry-and-tracing.md), [Enterprise gateway server](enterprise-gateway.md), [Feature gates reference](feature-gates-reference.md), [Updater and doctor](updater-and-doctor.md), and [Media native modules](media-native-modules.md).

## Module purpose

This module owns **operational mechanisms outside the local agent turn owner**. Some are observational (debug logs and telemetry), some are startup-critical setup (network and sink initialization), one is a standalone auth/inference/policy gateway process, some are foreground maintenance operations (install/update/doctor), and some transform input before it reaches the model loop (image and voice helpers).

It deliberately does *not* own:

- Tool execution (owned by the tools/security module).
- Session persistence (owned by the sessions module).
- Permission decisions (owned by the trust pipeline).

It can observe those subsystems, but it can also mutate the local installation, write diagnostic state, or produce media-derived input through explicit boundaries.

## Architecture thesis

Ops is a **mixed control and observation plane**: it surfaces structured events, initializes optional exporters, writes local diagnostics, exposes foreground maintenance commands, and provides binary helpers. These surfaces have separate gates and lifecycles; there is no single switch that governs every local log, first-party event, third-party exporter, updater, and media path.

## Source anchors

| Semantic alias | String or symbol | Architectural meaning |
| --- | --- | --- |
| NativeUpdaterStartEvent | `tengu_native_auto_updater_start` | Updater entry; runs out-of-band from the model loop. |
| NativeUpdaterLockEvent | `tengu_native_auto_updater_lock_contention` | Updater lock telemetry; multiple invocations are coordinated. |
| NativeUpdaterFailureEvent | `tengu_native_auto_updater_fail` | Updater failure classification (timeout/checksum/not_found). |
| NativeUpdaterSuccessEvent | `tengu_native_auto_updater_success` | Updater success telemetry. |
| AutoUpdateReleaseChannel | `auto-update` (release channel: `latest`, `stable`, `rc`) | Settings-driven release channel selection. |
| UpdaterPermissionPreflight | `Insufficient permissions for auto-updates` | Doctor-style preflight for updater. |
| AutoUpdaterStatusMachine | `autoUpdaterStatus`: `migrated`, `installed`, `disabled`, `enabled` | State machine for updater install kind. |
| DoctorDiagnosticsScreen | `/doctor diagnostics screen` | Doctor UX entry. |
| ShutdownCoordinator | `recordUncaughtAndCheckBreaker`, `gracefulShutdown`, `flushAnalyticsSinks` | Ops/shutdown coordinator surface. |
| EventLoopStallDetector | `startEventLoopStallDetector` | Optional diagnostic added at the bootstrap layer. |
| StartupProfilingMarks | `import_time`, `cli_entry`, `main_tsx_imports_loaded`, `cli_before_main_import` | Startup profiling event groups. |
| ProviderAndErrorGates | `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`, `CLAUDE_CODE_USE_ANTHROPIC_AWS`, `CLAUDE_CODE_USE_MANTLE`, `DISABLE_ERROR_REPORTING` | Provider/error-reporting gates evaluated up front. |
| TranscriptMirrorFrame | `transcript_mirror` | Ops-friendly local mirror of remote transcripts. |
| StatusLineRuntimes | `executeStatusLineCommand`, `pNb`, `fNb`, `Gyf`, `SBa` | Main prompt-line and separate subagent-row command protocols; see [Status line runtime and command protocol](../03-tools-integrations-security/status-line.md). |
| OpsNotificationStateFlags | `markFirstTeleportMessageLogged`, `isSessionPersistenceDisabled`, `isUserActiveForNotifications` | Cross-cutting state flags observed by ops/notifications. |
| MediaNativeJsShims | `require("/$bunfs/root/*.node")` | JS shims for embedded native helpers; the extraction script also recovers the gitignored `.node` payloads for inspection. |
| EnterpriseGateway | `command("gateway")`, `startGateway()` | Native-only OIDC/inference/managed-settings/spend/OTLP server process [~973,797](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973797). |

## Internal decomposition

```mermaid
flowchart TD
    Runtime[Claude Code runtime] --> Debug[Debug log writers]
    Runtime --> Telemetry[Telemetry sinks]
    Runtime --> Errors[Error reporter / breaker]
    Runtime --> Doctor[/doctor diagnostics]
    Runtime --> Updater[Native auto updater]
    Runtime --> Gateway[Enterprise gateway server]
    Runtime --> Hosted[Hosted review signals]
    Runtime --> Statusline[Status line / subagent status line]
    Runtime --> Native[Image / audio native helpers]

    Debug --> Logs[claude-dir/debug/sessionId.txt]
    Telemetry --> Sink[first-party / Datadog / OTel routes]
    Errors --> Sink
    Updater --> Channel[release channel: latest / stable / rc]
    Gateway --> GatewayState[Postgres / OIDC / upstreams / managed policy]
    Hosted --> Preflight[/v1/ultrareview/preflight]
    Native --> Attach[image / audio attachment inputs]

    Policy[managed settings + env gates] --> Telemetry
    Policy --> Errors
    Policy --> Hosted
    Policy --> Updater
```

| Sub-component | Responsibility |
|---|---|
| Debug log writers | Append-only logs for support; respect debug log gating. |
| Telemetry sinks | Route sampled first-party events, optional Datadog events, and separately initialized OTel signals; applicable sinks are flushed by shutdown paths. |
| Error reporter | Record uncaught/breaker state; gated by `DISABLE_ERROR_REPORTING`. |
| Doctor | User-facing diagnostics surface for environment, permissions, model selection, integrations. |
| Native auto updater | Version lookup, download, checksum, locking, staged install, launcher activation, and old-version cleanup. Foreground commands await this work; periodic checks invoke it outside a model turn. |
| Hosted review signals | `ultrareview`-adjacent preflight and result hooks; gated by hosted settings/policy. |
| Status line / subagent status line | Optional command-derived prompt line and JSONL task-row decorations. The focused lifecycle belongs to [Status line runtime and command protocol](../03-tools-integrations-security/status-line.md). |
| Native helpers | Original payload includes `image-processor.node` and `audio-capture.node` loaded via JS shims; local extraction retains gitignored copies of both binaries. |
| Enterprise gateway | Runs a separate Bun server process that owns OIDC device auth, Postgres state, Messages API routing, managed settings, spend enforcement, and OTLP relay. |

## Public interface

### Inputs

| Surface | Effect |
|---|---|
| `--debug`, `--debug-to-stderr`, `--ai-debug` | Enable debug logging variants. |
| `--add-trace-attribute key=value` | Attach OTEL attributes to runtime traces. |
| `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `DISABLE_AUTOUPDATER` | Coarse env gates for telemetry, errors, updater. |
| `OTEL_*` env | Wire OTEL sinks if configured. |
| `claude doctor` | Run the diagnostics path. |
| `claude update`, `claude install` | Manual updater entry. |
| `claude gateway --config <path>` | Starts the native-only enterprise gateway from a strict YAML configuration. |
| Settings: `cleanupPeriodDays`, `statusLine`, `subagentStatusLine`, `auto-update` channel/min version | Persistent ops configuration. |
| Managed policy: `disableAllHooks`, `disableRemoteControl`, `disableAgentView`, `disableSkillShellExecution` | Capability/policy switches surfaced through ops UX. |

### Outputs

| Output | Consumer |
|---|---|
| `tengu_*` event stream | Telemetry sink (when enabled). |
| Debug log files | Support tooling. |
| Doctor render | Terminal UX. |
| Updater state transitions | Settings/state file + telemetry. |
| Crash/error reports | Error sink (when enabled). |
| Status-line strings | Terminal UX. |
| Image/audio buffers | Attachment paths in the context/model loop. |
| Gateway OAuth/API/health endpoints | Enterprise clients, administrators, and upstream provider adapters. |

## Internal collaborators

| Collaborator | Contract |
|---|---|
| Runtime lifecycle | Calls into ops in `TopLevelMain` (event-loop stall detector, profiling marks) and in `preAction` (sinks/logs/managed settings refresh). |
| Settings/policy | Provides the gates ops checks before emitting or persisting. |
| Sessions | Receives `session_state_changed`, transcript-mirror, and bridge-state frames that ops surfaces or logs. |
| Tools/security | Emits tool decision telemetry; ops aggregates and persists. |
| Updater backend | External binary fetch + checksum verification; result is recorded in settings/state. |
| Hosted review backend | `/v1/ultrareview/preflight` and related routes. |
| Native helpers | Bun resolves `require("/$bunfs/root/...node")` for image/audio addons. |

## Design decisions

1. **Ops does not own model-turn policy, but it is not observation-only.** The updater changes the installation, diagnostics persist files, and media helpers transform inputs. Turn cancellation and tool authorization still belong elsewhere.
2. **Observability routes are independently controlled.** First-party event logging starts during general initialization; third-party/OTel setup has a separate after-trust path; Datadog, debug files, error JSONL, and MCP JSONL each have their own predicates and writers.
3. **Update scheduling and update execution are different.** Periodic checks run outside a model turn, while `claude update` and `claude install` are foreground commands that await network and filesystem work. Locks prevent a second installer from racing rather than making installation universally nonblocking.
4. **Doctor is the canonical diagnostics surface.** Other diagnostic frames (status line, debug logs) are complementary; `doctor` is the place to converge for support.
5. **Native helpers are isolated behind JavaScript façades.** The readable source establishes addon loading, method calls, disposal, recorder selection, and downstream use. Export tables and binary strings alone do not establish native scheduling, cleanup, or error propagation.
6. **Error reporting is opt-in / opt-out at a coarse grain.** `DISABLE_ERROR_REPORTING` short-circuits the reporter rather than reshaping individual call sites.
7. **Profiling marks are part of the lifecycle, not a separate framework.** `import_time`, `cli_entry`, `main_function_start`, `run_function_start`, `preAction_*` marks all flow through the same logger so support can read a single timeline.
8. **The gateway is an operational server role, not the local agent loop.** It proxies provider Messages requests and serves auth/policy/telemetry, but does not assemble or execute a developer's local tool-using turn.

## Operational seams

| Seam | What flows across | Why it exists |
|---|---|---|
| Early process-exit hook | Final flush / cleanup | Catch-all to give sinks one last chance to drain. |
| `process.on("SIGINT", ...)` | Headless vs interactive shutdown branching | Different ops UX for scripted vs human runs. |
| `gracefulShutdown` / `gracefulShutdownSync` | Coordinated flush + analytics | Keep telemetry consistent on planned termination. |
| `recordUncaughtAndCheckBreaker` | Uncaught exception path | Centralize crash classification, avoid noisy duplicates. |
| `tengu_native_auto_updater_*` events | Updater telemetry | Externalize updater health without coupling to UI. |
| `auto-update` settings + state | Channel + install kind | Persistent state for the updater state machine. |

## Failure modes

| Failure | Behavior |
|---|---|
| Global-package updater lock already held | Returns `status: "in_progress"`; the contender does not start another install. |
| Native version lock cannot be acquired | Returns `lockFailed: true`; no destructive activation is attempted by that invocation. |
| Download/checksum fails before native activation | The staged candidate is rejected; the active launcher is not replaced by that candidate. |
| Launcher activation is refused or fails | An unowned launcher is not overwritten. Specific Unix/Windows activation paths preserve or restore the old launcher, but this is not a guarantee for every possible filesystem failure. |
| Auto-update permission insufficient | Doctor preflight reports the fix-up message instead of silently failing. |
| Third-party telemetry is absent or initialization fails | Pending OTel events are discarded with `not_configured` or `init_failed`; configured providers still receive bounded best-effort flushes on shutdown. |
| Native helper missing or fails to load | JS call sites either choose a recorder fallback, preserve an already-safe image, or surface a media-specific error. There is no universal native-failure fallback. |
| Main status-line command errors | The custom line is suppressed; the loop continues. Subagent-decoration errors instead fall back to built-in task rows. |
| Event-loop stall detector triggers | Diagnostic events emitted; runtime continues. |
| Hosted review preflight rejects | UX surfaces the result; local workflow is not blocked. |
| Gateway configuration/store startup fails | The gateway command exits before listening; an already-running local Claude Code session is a separate process. |

## Extension points

| Extension | How it plugs in |
|---|---|
| Additional telemetry sink | Register through the analytics-sink interface and rely on `flushAnalyticsSinks`. |
| Additional debug log channel | Use existing logger; do not invent a new file format. |
| New diagnostic check | Add to the `doctor` command rather than scattering checks across the runtime. |
| Status line customization | Use the `statusLine` / `subagentStatusLine` settings; treat them as two command protocols with different input/output contracts, not inline model output. |
| Custom updater channel | Add to the `auto-update` settings enum; updater logic should not branch on out-of-band sources. |
| Native attachment type | Add a JS shim and a `.node` addon; attach via the existing attachment surface in the context module. |

## Caveats

- The inspected `.node` modules are stripped Linux x86-64 ELF shared objects. Their exports, linked dependencies, embedded crate/version strings, JS call sites, and selected exact-artifact observations are documented, but their internal control flow was not recovered from disassembly.
- Many `tengu_*` strings are runtime evidence; the precise sink schema is implementation-defined.
- This module touches many other modules but **does not own model-turn orchestration**. Media preprocessing can affect the input delivered to that orchestration; tool authorization, context assembly, and session semantics remain owned by their respective modules.

## Related docs

- [Status line runtime and command protocol](../03-tools-integrations-security/status-line.md)
- [Diagnostics and debug logs](diagnostics-and-debug-logs.md)
- [Telemetry and tracing](telemetry-and-tracing.md)
- [Feature gates reference](feature-gates-reference.md)
- [Updater and doctor](updater-and-doctor.md)
- [Media native modules](media-native-modules.md)
- [Audio capture and voice mode](audio-capture-and-voice.md)
- [Enterprise gateway server](enterprise-gateway.md)
- [System architecture](../00-start-here/system-architecture.md)
- [Runtime lifecycle architecture](../01-runtime-lifecycle/architecture.md)
- [Session and remote-control architecture](../04-sessions-persistence-remote/architecture.md)
