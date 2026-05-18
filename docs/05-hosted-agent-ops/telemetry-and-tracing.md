# Telemetry and tracing

This page owns the traffic, telemetry, analytics, and tracing/export side of the ops layer. It separates observability transport from local debug logs and from feature-gate decision logic.

Use [Diagnostics and debug logs](diagnostics-and-debug-logs.md) for local debug evidence, [Feature gates reference](feature-gates-reference.md) for GrowthBook/`tengu_*` feature gates, and [Environment variables reference](environment-variables-reference.md) for the canonical env-var list.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| EssentialTrafficGate | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Coarse traffic gate: essential traffic only. |
| DisableTelemetryGate | `DISABLE_TELEMETRY` | Telemetry disable gate. |
| DoNotTrackGate | `DO_NOT_TRACK` | Telemetry disable gate. |
| DisableErrorReportingGate | `DISABLE_ERROR_REPORTING` | Error-reporting disable gate. |
| OtelHeadersEnv | `OTEL_EXPORTER_OTLP_HEADERS` | OpenTelemetry exporter env surface. |
| TraceExportPath | `/v1/traces` | Beta/OTEL trace export path. |
| LogExportPath | `/v1/logs` | Beta/OTEL log export path. |
| TraceparentEnv | `TRACEPARENT` | Trace-context propagation. |
| AnalyticsFlushHook | `flushAnalyticsSinks` | Shutdown-time analytics/log/trace flush. |
| OtelHeadersHelperRuntime | `getOtelHeadersFromHelper`, `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | Settings-provided OTEL headers can come from a debounced helper command. |

## Bundle module in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `AnalyticsEventSink` | 3474 | `logEvent`, `logEventAsync`, `createAnalyticsState`, `attachAnalyticsSink`, `stripProtoFields`, `_setGlobalAnalyticsStateForTesting`, `setGlobalAnalyticsStateForTesting` | [Bundle module map — observability and ops](../99-research-atlas/module-map-from-renamed-cli.md#observability-and-ops) |

## Traffic policy

The traffic gate visible near line ~133 distinguishes coarse network policy from telemetry-specific disablement.

| Condition | Runtime traffic mode |
|---|---|
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set | `essential-traffic` |
| `DISABLE_TELEMETRY` is set | `no-telemetry` |
| `DO_NOT_TRACK` is truthy | `no-telemetry` |
| none of the above | `default` |

This distinction matters because essential traffic can still allow network calls required for core operation, while telemetry/error-reporting sinks are reduced or disabled.

## Telemetry signal families

`cli.renamed.js` contains many `tengu_*` strings. In this wiki, they are treated as operational signal names unless surrounding source confirms a product behavior. Common families include:

| Family | Examples | Interpretation |
|---|---|---|
| Tool/security | `tengu_tool_use_can_use_tool_allowed`, `tengu_tool_use_can_use_tool_rejected` | Tool permission outcomes and security decisions. |
| MCP/plugins | `tengu_mcp_tool_call_auth_error`, plugin install/update signals | Integration health and auth failures. |
| Agents/scheduling | scheduled-task, auto-mode, background-agent signals | Agent/task runtime observability. |
| Remote/bridge | bridge state, remote backend, CCR-style signals | Remote Control and bridge operation. |
| Updater | `tengu_native_auto_updater_*` | Native updater lifecycle. |
| API/model usage | API request duration, token, cost, retry, and quota signals | Provider-call accounting and support evidence. |

## OpenTelemetry and trace export

| Surface | Role |
|---|---|
| `TRACEPARENT`, `TRACESTATE` | W3C trace-context propagation into subprocess/session env when available. |
| `BETA_TRACING_ENDPOINT` | If set, beta exporter delegates to `${endpoint}/v1/traces` and `${endpoint}/v1/logs`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Standard OTLP endpoint. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` and per-signal protocol envs | Selects `grpc`, `http/json`, or `http/protobuf` exporters. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Header configuration for OTLP export. |
| `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER` | Selects metrics/log exporters such as console, OTLP, or prometheus. |
| `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_USER_PROMPTS` | Controls how much tool/user detail can be logged. |
| `--add-trace-attribute key=value` | Adds runtime trace attributes. |

The source installs final flush hooks on exit paths, so logs/traces get a best-effort drain during shutdown.

`otelHeadersHelper` is a settings-provided command helper for OTEL headers. The decoded runtime debounces helper execution with `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS`, requires the helper to return a JSON object with string values, and logs helper failures as OpenTelemetry header errors. Project/local helper commands are also workspace-trust gated; see [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md).

## Error reporting

Error reporting is controlled separately from telemetry. `DISABLE_ERROR_REPORTING`, provider-specific modes, and essential-traffic mode can short-circuit external error reporting even when local debug logs exist.

## Safe interpretation rules

1. Treat `tengu_*` as evidence of telemetry or a feature gate, not as a stable public event schema.
2. Do not infer live network behavior from static endpoint strings alone.
3. Keep sensitive values out of logs; env-var names can be documented, values should not be captured.
4. Use [Diagnostics and debug logs](diagnostics-and-debug-logs.md) for file/stdout/stderr debug evidence.

## OpenTelemetry stack internals

The `TelemetryStack` module (`cli.renamed.js:374149` onward) is the OpenTelemetry bootstrap. It is gated by `CLAUDE_CODE_ENABLE_TELEMETRY` and by a separate first-party BigQuery metrics path. The runtime ships an OTLP exporter for each of the three OTel signals (metrics, logs, traces) and chooses protocol/transport at startup from the standard `OTEL_EXPORTER_OTLP_*` env vars.

### Bootstrap (`bootstrapTelemetry`)

- Defaults `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE = "delta"` when unset.
- When `vX()` (beta tracing predicate) is true AND no global tracer provider exists, installs a beta tracer + logger provider plus a 5 s scheduled span delay.
- `BETA_TRACING_ENDPOINT` env, if set, wires the beta tracer to `<endpoint>/v1/traces` and the beta event logger to `<endpoint>/v1/logs`.

### Resource attributes (`sT7`)

Computed once and cached. Include: `service.name = "claude-code"`, `service.version = "2.1.143"` (bundle version); OS attributes via `zg.osDetector.detect()`; host arch only (`SEMRESATTRS_HOST_ARCH`) — no host id, to avoid identifying the workstation; env detector output, optionally filtered to keep only `user.*` / `identity.*` keys when first-party user attributes (`T$8()`) are present; `wsl.version` when running under WSL.

### Exporter selection (`parseExporterTypes` / `getOtlpLogExporters` / sibling helpers)

`parseExporterTypes(env)` splits comma-separated lists from `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER`, `OTEL_TRACES_EXPORTER`, dropping `"none"` entries. For each surviving type:

| Type | Protocol(s) | Notes |
|---|---|---|
| `console` | n/a | Inline console exporter; metric variant additionally logs `Resource Attributes` once for debugging. |
| `otlp` | `grpc` / `http/json` / `http/protobuf` | Picked from `OTEL_EXPORTER_OTLP_<SIGNAL>_PROTOCOL` (fallback `OTEL_EXPORTER_OTLP_PROTOCOL`). Each protocol lazily imports its own OTLPMetric/Log/Trace exporter. Headers come from `parseOtelHeadersEnvVar()`; URL is `<endpoint>/v1/<signal>`. When `getGatewayAuth()` exists, the URL is rewritten to the gateway and an async header callback signs each request. |
| `prometheus` (metrics only) | local pull | Adds a `PrometheusExporter` wrapped into the same `PeriodicExportingMetricReader`. |

Unknown protocol or type strings throw a descriptive error so misconfigured env vars surface at startup.

### `initializeTelemetry()`

1. `profileCheckpoint("telemetry_init_start")`.
2. `bootstrapTelemetry()`.
3. Install the W3C trace context propagator.
4. When `C$q()` (subprocess-spawn predicate) is true, strip `console` from every `OTEL_*_EXPORTER` env so subprocesses do not double-print to the parent terminal.
5. Build OTLP exporters only when `isTelemetryEnabled()` is true.
6. If `isBigQueryMetricsEnabled()` is true (`PmH()` OR `isClaudeAISubscriber() && org_type in (enterprise, team)`), also add a 5-minute periodic exporter shipping first-party metrics to BigQuery.
7. When `vX()` (beta tracing) is on, build only the meter provider on top of the beta tracer.
8. Otherwise build the full pipeline: `MeterProvider` with readers; OTLP log exporters wrapped in batch processors with `OTEL_LOGS_EXPORT_INTERVAL` (default 5 s); OTLP trace exporters with `OTEL_TRACES_EXPORT_INTERVAL` (default 5 s).
9. Register a shutdown hook that flushes and shuts down all providers within `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` (default 2 s).
10. Return a `Meter` named `com.anthropic.claude_code`.

### `flushTelemetry()`

Forces a flush of the meter, logger, and tracer providers concurrently. Bounded by `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` (default 5 s). On timeout logs a warning; on other failures logs an error. Called from session-end and `gracefulShutdown` paths.

### First-party event sampling (`getEventSamplingConfig`, `shouldSampleEvent`, `logGrowthBookExperimentTo1P`)

The `EventSamplingControl` module (loaders at `cli.renamed.js:167043, 167244`) gates first-party event logging:

- `getEventSamplingConfig()` resolves `tengu_event_sampling_config` via `getFeatureValue_CACHED_WITH_REFRESH` and validates against a Zod schema.
- `shouldSampleEvent(eventName)` returns true when the config opts the event in.
- `logEventTo1PAwaitable(eventName, payload)` is the awaitable variant for callers that need to confirm the 1P backend received the event.
- `logGrowthBookExperimentTo1P(experimentId, variationId, attributes)` is the bridge from GrowthBook experiment exposure to the 1P pipeline.
- `shutdown1PEventLogging()` and `reinitialize1PEventLoggingIfConfigChanged()` drain the queue on shutdown and re-arm when the sampling config changes mid-session.

The 1P pipeline runs in parallel with the OTel pipeline: one `logEvent` call can fan out to BigQuery metrics, the 1P event sink, and any operator-configured OTLP backend.

### Environment variables that shape the stack

| Env var | Effect |
|---|---|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Master switch for operator-configured OTel exporters. |
| `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER` / `OTEL_TRACES_EXPORTER` | Per-signal exporter type list. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` / `OTEL_EXPORTER_OTLP_<SIGNAL>_PROTOCOL` | `grpc` / `http/json` / `http/protobuf`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base URL; signal path is appended. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Comma-separated `k=v` headers. |
| `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_LOGS_EXPORT_INTERVAL`, `OTEL_TRACES_EXPORT_INTERVAL` | Per-signal flush schedule. |
| `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE` | Defaults to `delta` if unset. |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` / `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | Shutdown / flush bounds. |
| `BETA_TRACING_ENDPOINT` | Beta tracer + logger destination. |

## Error log sink and MCP error log fan-out

Separately from the OTel / 1P pipelines, the runtime persists per-session error and MCP logs to disk via the sink installed by `initializeErrorLogSink` ([cli.renamed.js line 600854](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L600854)). The sink is wired during startup right next to the analytics sink (`initializeErrorLogSink(), initializeAnalyticsSink()`).

Files are named by today's date stamp (`zV4 = eYq(new Date())`) and rooted under the user data directory:

- `getErrorsPath() = path.join(claudeDir.errors(), DATE + ".jsonl")` — catches every `logError(err)` call. The line carries an axios-aware prefix when the error came from `o8.isAxiosError(H)`: `[url=...,status=...,body=...] error.stack`. That prefix is what makes 4xx/5xx responses self-diagnostic when a user shares an `errors.jsonl` slice.
- `getMCPLogsPath(serverName) = path.join(claudeDir.mcpLogs(serverName), DATE + ".jsonl")` — fanout target for `logMCPError(server, err)` and `logMCPDebug(server, msg)`. Each line is `{ error?, debug?, timestamp, sessionId, cwd }`.

Both writers share the buffered file-writer factory `YF6(path)`: per-path lazy creation, batched writes (`flushIntervalMs: 1000`, `maxBufferSize: 50`), `appendFileSync` with an inline `mkdirSync` fallback on the first ENOENT, and a one-shot suppressed-error mode (`if (!K) ((K = !0), onDebug("Dropping log batch for ${path}: ..."))`) so a disk-full or permission failure logs once but never spams the debug log. Every writer registers `SK(async () => $?.dispose())` so the [shutdown coordinator](../01-runtime-lifecycle/cli-main-paths.md#shutdown-coordinator-and-signal-exit) drains buffered lines on SIGTERM.

`initializeErrorLogSink()` itself does not write to disk — it calls `Hfq({ logError, logMCPError, logMCPDebug, getErrorsPath, getMCPLogsPath })` to register the five functions with the global error-routing surface that `logError`/`logEvent` paths look up. Tests get explicit hooks: `_flushLogWritersForTesting()` forces every cached writer to flush, and `_clearLogWritersForTesting()` disposes them and clears the map.

## Related docs

- [Diagnostics and debug logs](diagnostics-and-debug-logs.md)
- [Feature gates reference](feature-gates-reference.md)
- [Environment variables reference](environment-variables-reference.md)
- [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md)
- [Operations and native-support architecture](architecture.md)
