# Environment variables reference

This page centralizes environment variables visible in the analyzed runtime and already documented across model, session, tool, MCP, diagnostics, telemetry, and feature-gate pages.

## Scope and caveats

- This is a source-visible environment-variable reference, not a guarantee that every variable is public, stable, or relevant to every launch mode.
- Some variables are hard gates; others are provider selectors, credentials, trace context, or runtime integration handoffs.
- Secret-bearing variables are listed for documentation only. Do not print or log their values in diagnostics.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| SdkCredentialEnv | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` | Embedded SDK credential initialization path. |
| BedrockProviderEnv | `CLAUDE_CODE_USE_BEDROCK` | Provider classifier branch. |
| VertexProviderEnv | `CLAUDE_CODE_USE_VERTEX` | Vertex provider branch. |
| MainModelEnv | `ANTHROPIC_MODEL` | Model selection environment variable. |
| SmallFastModelEnv | `ANTHROPIC_SMALL_FAST_MODEL` | Small/fast model override. |
| DebugLogsDirEnv | `CLAUDE_CODE_DEBUG_LOGS_DIR` | Debug-log directory override. |
| DebugLogLevelEnv | `CLAUDE_CODE_DEBUG_LOG_LEVEL` | Debug-log level override. |
| EssentialTrafficEnv | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Essential-traffic-only gate. |
| DisableTelemetryEnv | `DISABLE_TELEMETRY` | Telemetry disable gate. |
| DoNotTrackEnv | `DO_NOT_TRACK` | Telemetry disable gate. |
| DisableErrorReportingEnv | `DISABLE_ERROR_REPORTING` | Error-reporting disable gate. |
| DisableGrowthBookEnv | `DISABLE_GROWTHBOOK` | Feature-evaluation kill switch. |
| McpToolTimeoutEnv | `MCP_TIMEOUT` | MCP tool timeout environment variable. |
| McpConnectTimeoutEnv | `MCP_CONNECT_TIMEOUT_MS` | MCP connection timeout environment variable. |
| SessionAccessTokenEnv | `CLAUDE_CODE_SESSION_ACCESS_TOKEN` | Remote/session ingress token source. |
| WebSocketAuthFdEnv | `CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR` | WebSocket auth file-descriptor handoff. |
| OtelHeadersEnv | `OTEL_EXPORTER_OTLP_HEADERS` | OpenTelemetry exporter env surface. |
| XaaEnableEnv | `CLAUDE_CODE_ENABLE_XAA` | Enables MCP cross-app access when server config requests `oauth.xaa`. |
| OtelHeadersHelperDebounceEnv | `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | Debounce interval for settings-provided OTEL header helper execution. |
| TraceparentEnv | `TRACEPARENT` | Trace-context propagation. |
| DisableCronEnv | `CLAUDE_CODE_DISABLE_CRON` | Cron/scheduled-task kill switch. |
| SafeModeEnv | `CLAUDE_CODE_SAFE_MODE` | Disables customizations for recovery startup. |
| ScreenReaderEnv | `CLAUDE_AX_SCREEN_READER` | Forces screen-reader-friendly flat rendering. |
| SubagentLimitEnv | `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` | Session-wide agent spawn budget (default 200). |
| WebSearchLimitEnv | `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` | Session-wide WebSearch budget (default 200). |

## Authentication and credential handoff

| Variable | Purpose | Owner |
|---|---|---|
| `ANTHROPIC_API_KEY` | API-key credential source. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `ANTHROPIC_AUTH_TOKEN` | Bearer/OAuth-style credential source. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token input surface. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` | OAuth token via file descriptor. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR` | API key via file descriptor. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_ENABLE_XAA` | Enables the MCP cross-app access OAuth branch when a server config uses `oauth.xaa`. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_SESSION_ACCESS_TOKEN` | Remote/session ingress token. | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| `CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR` | WebSocket auth handoff for bridge/session transports. | [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md) |

## Provider and model selection

| Variable | Effect | Owner |
|---|---|---|
| `CLAUDE_CODE_USE_BEDROCK` | Selects Bedrock provider branch. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_USE_VERTEX` | Selects Vertex provider branch. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_USE_FOUNDRY` | Selects Foundry provider branch. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_USE_ANTHROPIC_AWS` | Selects Anthropic AWS provider branch. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLAUDE_CODE_USE_MANTLE` | Selects Mantle provider branch. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `ANTHROPIC_MODEL` | Environment-level main model override. | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md) |
| `ANTHROPIC_SMALL_FAST_MODEL` | Small/fast helper model override. | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md) |
| `AWS_REGION`, `AWS_DEFAULT_REGION` | AWS-region selection surfaces for AWS-like provider paths. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `CLOUD_ML_REGION` | Google/Vertex region surface. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `ANTHROPIC_BASE_URL` | Custom API/base URL surface. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |

## Diagnostics, telemetry, and tracing

| Variable | Effect | Owner |
|---|---|---|
| `DEBUG`, `DEBUG_SDK` | Enables debug behavior in selected paths. | [Diagnostics and debug logs](diagnostics-and-debug-logs.md) |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | Overrides debug log directory. | [Diagnostics and debug logs](diagnostics-and-debug-logs.md) |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | Sets debug log level threshold when recognized. | [Diagnostics and debug logs](diagnostics-and-debug-logs.md) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Switches to essential-traffic mode. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `DISABLE_TELEMETRY` | Disables telemetry. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `DO_NOT_TRACK` | Disables telemetry. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `DISABLE_ERROR_REPORTING` | Disables error reporting. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `DISABLE_GROWTHBOOK` | Disables GrowthBook feature evaluation. | [Feature gates reference](feature-gates-reference.md) |
| `TRACEPARENT`, `TRACESTATE` | W3C trace-context propagation. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `BETA_TRACING_ENDPOINT` | Beta trace/log exporter endpoint base. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `OTEL_*` | OpenTelemetry metrics/logs/traces exporter configuration. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | Debounces `otelHeadersHelper` command execution. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `OTEL_LOG_TOOL_DETAILS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_USER_PROMPTS` | Controls how much tool/user detail may be logged. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `OTEL_LOG_ASSISTANT_RESPONSES` | Controls assistant-response content logs; when unset it follows `OTEL_LOG_USER_PROMPTS`. | [Telemetry and tracing](telemetry-and-tracing.md) |
| `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` | Overrides the default 60 KB OTel content-attribute truncation limit. | [Telemetry and tracing](telemetry-and-tracing.md) |

## MCP, plugins, and agents

| Variable | Effect | Owner |
|---|---|---|
| `MCP_TIMEOUT` | MCP tool-call timeout, with a documented default fallback. | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `MCP_CONNECT_TIMEOUT_MS` | MCP connection timeout. | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `MCP_CONNECTION_NONBLOCKING` | Runtime MCP connection non-blocking gate. | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | Plugin transport preference gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE` | Plugin zip-cache gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | Synchronous plugin installation behavior. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` | Built-in agent availability gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_DISABLE_AGENT_VIEW` | Agent UI/view gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT` | Forwards subagent text/thinking into stream-JSON output with parent linkage. | [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md) |
| `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` | Sets the spawn budget; default 200 and reset by `/clear`. | [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) |
| `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` | Sets the WebSearch call budget; default 200. | [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md) |
| `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | Changes/disables the foreground duration before a long MCP call becomes a background task. | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `CLAUDE_CODE_PROCESS_WRAPPER` | Corporate launcher prefix for the background supervisor/workers and covered self-spawns. | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |

## Feature, context, UI, and update gates

| Variable | Effect | Owner |
|---|---|---|
| `CLAUDE_CODE_DISABLE_CRON` | Disables scheduled tasks / Kairos cron paths. | [Agent runtime, scheduling, and completion](../06-agents-automation/agent-runtime-scheduling-and-completion.md) |
| `CLAUDE_CODE_SAFE_MODE` | Environment equivalent of `--safe-mode`; disables user/project customizations but not managed policy. | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |
| `CLAUDE_AX_SCREEN_READER` | Overrides the `axScreenReader` setting and `--ax-screen-reader` selection. | [Command-line reference](../01-runtime-lifecycle/command-line-reference.md) |
| `CLAUDE_CODE_DISABLE_MOUSE_CLICKS` | Disables click/drag/hover while retaining wheel scrolling. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CLIENT_PRESENCE_FILE` | Marker file that suppresses mobile push notifications while the user is present at the machine. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_ENABLE_STREAM_WATCHDOG` | Enables/disables the provider stream idle watchdog (enabled by default in this build). | [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md) |
| `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP` | Disables memory-pressure reaping of idle background shell commands. | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |
| `CLAUDE_CODE_DISABLE_WORKFLOWS`, `CLAUDE_CODE_WORKFLOWS` | Disables or explicitly selects workflow availability. | [Dynamic workflows](../06-agents-automation/dynamic-workflows.md) |
| `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS`, `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS` | Tunes workflow-size warning thresholds. | [Dynamic workflows](../06-agents-automation/dynamic-workflows.md) |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | Advisor/permission-adjacent tool gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` | Experimental advisor tool gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | Context-window feature gate. | [Feature gates reference](feature-gates-reference.md) |
| `DISABLE_COMPACT` | Context compaction gate. | [Feature gates reference](feature-gates-reference.md) |
| `DISABLE_INTERLEAVED_THINKING` | Interleaved-thinking gate. | [Feature gates reference](feature-gates-reference.md) |
| `USE_API_CONTEXT_MANAGEMENT` | API-side context-management gate. | [Feature gates reference](feature-gates-reference.md) |
| `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`, `CLAUDE_CODE_NO_FLICKER`, `CLAUDE_CODE_DISABLE_MOUSE`, `CLAUDE_CODE_FORCE_SYNC_OUTPUT`, `CLAUDE_CODE_ACCESSIBILITY`, `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Terminal rendering/accessibility gates. | [Feature gates reference](feature-gates-reference.md) |
| `DISABLE_UPDATES`, `DISABLE_AUTOUPDATER`, `FORCE_AUTOUPDATE_PLUGINS` | Native/plugin updater behavior gates. | [Updater and doctor](updater-and-doctor.md) |

## Interpretation rules

1. Treat credential and token variables as sensitive; never capture values in examples or logs.
2. Prefer this page for variable names, and the owner pages for call paths and semantics.
3. Treat `CLAUDE_CODE_USE_*` provider variables as provider selectors; do not assume multiple provider selectors compose safely.
4. Treat `tengu_*` strings as feature/telemetry signals, not user-settable environment variables unless an explicit env var is visible.

## Related docs

- [Diagnostics and debug logs](diagnostics-and-debug-logs.md)
- [Telemetry and tracing](telemetry-and-tracing.md)
- [Feature gates reference](feature-gates-reference.md)
- [Updater and doctor](updater-and-doctor.md)
- [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)
