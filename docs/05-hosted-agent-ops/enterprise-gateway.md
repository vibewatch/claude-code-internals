# Enterprise gateway server

Claude Code `2.1.215` contains a native-only enterprise gateway server. It is a real top-level process role—`claude gateway --config <path>`—that joins corporate OIDC sign-in, Messages API proxying, managed settings, model routing, spend controls, and OTLP relay behind one operator-managed endpoint.

This page owns the **server lifecycle** embedded in the CLI bundle. It is distinct from the client-side gateway credential/provider branch in [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md): that page explains how a developer's CLI talks to a gateway; this page explains what the bundled gateway process itself does.

## Short answer

```mermaid
flowchart TD
    Command[claude gateway --config gateway.yaml] --> Config[YAML read + env/file interpolation + strict schema]
    Config --> DB[Postgres connect + advisory migration lock]
    DB --> OIDC[OIDC discovery + device authorization]
    DB --> Policy[Managed settings + role matching]
    DB --> Spend[Spend limits + audit + metering]
    OIDC --> Server[Bun HTTP/TLS server]
    Policy --> Server
    Spend --> Server
    Server --> Inference[/v1/messages + count_tokens + models]
    Inference --> Upstreams[Anthropic / Bedrock / Anthropic AWS / Vertex / Foundry]
    Server --> OTLP[/v1/metrics + logs + traces]
    Server --> Health[/healthz + /readyz]
```

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact symbol or string | Meaning |
|---|---:|---|---|
| GatewayCommand | [~978,332](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L978332) | `command("gateway")`, `--config <path>` | Registers the top-level server command. |
| GatewayConfigInterpolation | [~970,710](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L970710) | `zQa()`, `${file:...}`, `undefined env var in config` | Recursively expands file and environment placeholders. |
| GatewayConfigLoader | [~970,733](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L970733) | `XZf()`, `nxS().parse(...)` | Reads YAML, rejects the removed `dev:` mode, and validates the strict schema. |
| GatewayManagedSettings | [~970,750](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L970750) | `JZf()`, `dxS()`, `Kti()` | Builds role-specific managed payloads and optionally injects telemetry env variables. |
| GatewaySsrfGuard | [~970,259](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L970259) | `$fe()`, `NHr()`, `ECONNREFUSED_SSRF` | Blocks metadata/link-local/unsafe loopback targets and DNS rebinding. |
| GatewayUpstreamFactory | [~971,573](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L971573) | `cem()` | Constructs the supported upstream adapters and credentials. |
| GatewayInferenceProxy | [~971,857](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L971857) | `uem()` | Validates, routes, retries selected auth failures, and proxies inference. |
| GatewaySpendLimitAdminRoutes | [~972,475](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L972475) | `Aem()`, `/v1/organizations/spend_limits` | Authenticates and dispatches the spend-limit/effective/audit route family. |
| GatewaySpendEnforcement | [~973,065](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973065) | `Dem()`, `precheck`, `meter` | Applies limits before inference and records usage afterward. |
| GatewayTelemetryRelay | [~973,220](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973220) | `Nem()`, `/v1/metrics`, `/v1/logs`, `/v1/traces` | Asynchronously fans out OTLP payloads with bounded concurrency and circuit breaking. |
| GatewayMigrations | [~973,486](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973486) | `Uem()`, `pg_advisory_lock(6775156)` | Serializes and applies schema migrations 1–6. |
| GatewayStore | [~973,614](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973614) | `qem()`, `Bun.SQL` | Opens Postgres, schedules expiry/retention work, and exposes the key-value interface. |
| GatewayServer | [~973,797](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L973797) | `startGateway()` | Wires config, store, OIDC, policy, upstreams, routes, response hardening, and stop. |
| GatewayBootWarnings | [~974,622](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L974622) | `collectBootWarnings()` | Reports model, managed-policy, Desktop, and metering configuration hazards. |

## Entrypoint and startup order

The command has one gateway-specific option:

```text
claude gateway --config <path>
```

The action calls `startGateway(config)` and reports startup failures as `claude gateway: <message>`. `startGateway()` first checks that `Bun` exists. An npm-only execution fails with guidance to install the native binary; this is not a portable Node server hidden behind the same command.

The startup sequence is:

1. Read and validate the YAML configuration.
2. Open Postgres, acquire the migration advisory lock, and apply missing migrations.
3. Build session-signing keys, spend enforcement, OIDC discovery, upstream adapters, managed-policy payloads, and optional TLS material.
4. Emit configuration warnings that can be determined before serving.
5. Start `Bun.serve()` and asynchronously probe whether the host can reach cloud metadata.

A failure before `Bun.serve()` prevents the listener from starting. Database connection errors with recognizable network causes are rewritten to point the operator at `store.postgres_url`; other errors propagate.

## YAML loading and schema

`XZf()` parses YAML and then recursively applies `zQa()`:

| Form | Behavior |
|---|---|
| `${NAME}` inside a string | Replaced from `process.env.NAME`; an undefined variable aborts startup. |
| `${file:/absolute/path}` as the whole string | Replaced with trimmed UTF-8 file content; relative paths are rejected. |
| Arrays and objects | Traversed recursively, so secrets can be supplied below nested keys. |

This interpolation is powerful but not a shell: there is no command substitution. The resulting object is parsed by a strict schema. The removed `dev:` key gets a targeted error because the gateway is Postgres-only in this build.

Major top-level groups are:

| Group | Server responsibility |
|---|---|
| `listen` | Host/port, optional TLS cert/key, externally visible `public_url`, and trusted proxy CIDRs. |
| `access_control` | Client-IP allow and deny CIDRs. |
| `limits`, `rate_limits`, `timeouts` | Request/header/URL bounds, device-flow limits, and upstream time-to-first-byte budget. |
| `upstreams`, `models`, `auto_include_builtin_models` | Provider adapters, operator model mappings, and built-in model inclusion. |
| `oidc`, `session` | IdP discovery/claims/groups and gateway JWT signing/TTL. |
| `store` | Postgres URL, optional credentials, and pool size. |
| `telemetry` | OTLP relay destinations and signal selection. |
| `managed` | One settings document or ordered role policies. |
| `admin`, `enforcement` | Spend-limit keys/groups, retention, metering, and fail-open/fail-closed policy. |

When `listen.host` is not loopback, `listen.public_url` is required. That prevents OAuth redirect and token issuer construction from a client-controlled `Host` header.

## Postgres state, migrations, and retention

`qem()` uses `Bun.SQL`, with a five-second connection timeout and a default pool size of five. The server warns when the detected PostgreSQL major version is below the supported floor of **14**.

`Uem()` reserves one connection and takes `pg_advisory_lock(6775156)` before touching `_migrations`. Versions 1–6 create:

1. expiring `kv` records for device-flow and rate-limit state;
2. `spend_limits` plus `caps_by_period(...)`;
3. `admin_audit`;
4. period-bucketed `spend`;
5. `principal_emails`; and
6. the `spend_period_cents` index.

Each migration is transaction-wrapped and recorded in `_migrations`; the advisory lock is released in `finally`. This coordinates replicas that share the same database, but it is not a distributed lock for ordinary inference.

Two timers run after migration:

- every 30 seconds, delete expired `kv` rows;
- every hour, delete bounded batches of old audit, spend, and identity rows.

Defaults are 365 days of audit events, 13 months of spend buckets, and 90 days of identity metadata. A role lacking `DELETE` receives a warning once per affected table; the server keeps running and those rows can outlive the configured retention window.

## OIDC device authorization

The server publishes gateway-local RFC 8414-style metadata at `/.well-known/oauth-authorization-server` and implements a device flow around these routes. In this build the discovery document advertises `scopes_supported: ["openid", "profile", "email"]`, while the outbound IdP authorization request defaults to `openid profile email offline_access` unless `oidc.scopes` overrides it. The discovery field is therefore not a complete reflection of outbound IdP scopes.

| Route | Role |
|---|---|
| `POST /oauth/device_authorization` | Mints opaque device/user codes and stores pending state with expiry. |
| `GET /device` | Shows code entry or confirmation UI. |
| `POST /device` | Applies CSRF/rate-limit checks and redirects to the corporate IdP. |
| `GET /oauth/callback` | Verifies encrypted state and same-browser cookie binding, exchanges the code, checks identity, and completes/denies the device record. |
| `POST /oauth/token` | Polls a device grant or exchanges an IdP refresh token for a gateway session token. |

Device codes expire after 600 seconds and the advertised polling interval is five seconds. Repeated polling produces `slow_down`; pending, denied, and expired states use the corresponding OAuth errors.

OIDC discovery and its `jwks_uri`, `token_endpoint`, and `userinfo_endpoint` pass the outbound SSRF guard. Identity checks can enforce verified email/domain, a configurable groups claim, or Google Workspace group lookup through a service account. The source also warns about common Google refresh-token and groups-claim misconfigurations.

The callback binds state to a hash of a short-lived `HttpOnly; SameSite=Lax` cookie and uses timing-safe comparison. HTTPS adds the `Secure`/`__Host-` form. Rendering the verification page is not authorization by itself: the callback still validates state, browser binding, pending device state, IdP claims, and role restrictions.

## Managed settings and Desktop bootstrap

`managed` accepts either one JSON settings file or an ordered policy array. Each policy can match OIDC groups and/or email domain and carry CLI settings plus an optional Desktop block. A catch-all policy is merged as a base; the runtime warns if it appears before policies it would shadow. There is also an implicit telemetry-only mode: when `telemetry.forward_to` and `listen.public_url` are configured without an explicit `managed:` block, `JZf()` synthesizes an empty catch-all policy so the gateway can deliver telemetry env variables.

Gateway-managed CLI settings are checked against the embedded settings schema. Unknown keys abort startup, and `mcpServers` is explicitly unsupported through this gateway path in `2.1.215`.

The intended client path is `GET /managed/settings`, although this build's executable branch matches only the path and does not independently reject another HTTP method. The handler:

- requires the gateway bearer token;
- selects the first matching role policy;
- returns `404 not configured` when no managed payload exists, or `404 no policy matched` when a payload exists but the user matches none;
- uses the payload checksum as `ETag`; and
- honors `If-None-Match` with `304`.

When telemetry relay and `public_url` are configured, the gateway injects `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_METRICS_EXPORTER=otlp`, `OTEL_LOGS_EXPORTER=otlp`, `OTEL_TRACES_EXPORTER=otlp`, `OTEL_EXPORTER_OTLP_ENDPOINT=<public_url>`, and `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`. Policy-provided env values are merged over those defaults.

`GET /user/bootstrap` is not only a pass-through Desktop blob. It is available only when a matching policy has a `desktop:` block; otherwise it returns a source-visible `not_found_error`. The gateway constructs server-owned fields such as `inferenceProvider:"gateway"`, the gateway base/auth scheme, optional OTLP fields, filtered models/tools/network hosts, and expiration, then merges the policy's Desktop fields. Client-side consumption remains outside this server lifecycle.

## Inference and model routing

The gateway constructs these upstream types:

- Anthropic with API key, OAuth token, or OIDC federation;
- Amazon Bedrock;
- Anthropic on AWS;
- Google Vertex AI; and
- Microsoft Foundry.

A model can be mapped explicitly through `models[].upstream_model.<name>`. With built-ins enabled, known Anthropic family IDs can also map through the provider catalog. A role's managed `availableModels` further filters `/v1/models` and rejects disallowed inference requests.

`POST /v1/messages` and `/v1/messages/count_tokens` validate JSON, then try eligible upstreams in configuration order. Selected credential failures invalidate cached credentials and retry that upstream once. If no attempt succeeds, the proxy preserves a preferred 429, then auth, 404, or 501 response before falling back to a generic 502. A client-aborted request becomes 499.

For SDK-backed providers, the gateway translates requests and streams provider events back as Anthropic-shaped SSE. Bedrock moves compatible beta headers into `anthropic_beta`; the gateway handler itself returns `501 not_supported` for count-tokens. Any client fallback after that response belongs to the client-side model/request lifecycle, not this server handler. The server does not claim every provider/deployment serves every catalog model; explicit mappings and deployment entitlement still matter.

## Spend limits, audit, and metering

An optional `admin` block enables `/v1/organizations/spend_limits` and its `effective`/`audit` views. `x-api-key` credentials receive read or write authority according to the matched key list. A gateway bearer is accepted only for **write-capable** admin access, only when `admin.admin_groups` is nonempty, and only when the authenticated user's groups intersect it; there is no bearer-based read-only admin mode in this handler.

Spend-limit upsert takes a transaction-scoped advisory lock keyed by scope and period, writes the limit, and inserts an audit record in the same transaction. Limits can target a user, RBAC group, or organization for daily, weekly, or monthly periods. The effective resolver gives user scope precedence, then group, then organization; `group_limit_mode` selects the smallest or largest group cap.

Before `/v1/messages`, `precheck()` can return a non-retryable 429 `billing_error`. Store failures are fail-open by default and fail-closed only when `enforcement.fail_closed_on_error` is true. Successful responses are wrapped so usage can be extracted while streaming and recorded asynchronously. Missing exact model rates use a default tier and produce an operator warning rather than stopping inference.

## OTLP relay

Authenticated `POST /v1/metrics`, `/v1/logs`, and `/v1/traces` requests return `200` immediately after queueing fan-out. Destinations opt into individual signals.

The relay allows at most 128 fan-outs in flight. A destination opens a 30-second circuit after five consecutive failures; saturated or circuit-open work is dropped with operator warnings. Each outbound request has a ten-second timeout and passes the same SSRF guard. The immediate `200` therefore means the gateway accepted the payload, not that every destination stored it.

## Network and response hardening

The outbound guard permits HTTP(S) URLs but blocks metadata hostnames, link-local addresses, and loopback/unspecified targets unless the operator explicitly sets `CLAUDE_GATEWAY_ALLOW_LOOPBACK`. DNS names are resolved first and requests are sent to the selected address while preserving the original host/TLS server name, limiting DNS-rebinding exposure. `CLAUDE_GATEWAY_ALLOW_LOOPBACK` is an operator escape hatch, not a normal requirement.

At boot, the process probes `169.254.169.254` unless loopback override is active and warns if cloud metadata is reachable. The probe does not itself install a network policy.

Inbound controls include trusted-proxy-aware client IP derivation, deny-before-allow CIDRs, device-flow rate limits, and optional TLS. Request framing returns `414` for URL-length overflow, `431` for header-byte overflow, `411` for `Transfer-Encoding` without `Content-Length`, and `413` for an invalid, negative, or oversized declared body. Responses add `nosniff`, frame denial, no-referrer, and same-origin opener headers. HSTS is added only when the Bun listener has actual `listen.tls` material; an `https://` `public_url` alone does not emit it.

## Health, failures, and shutdown

| Surface | Result |
|---|---|
| `GET /healthz` | Returns `200 ok` once the server accepts requests, except a denylisted client is rejected first. |
| `GET /readyz` | Probes the store and returns `200 ready` or `503 store unavailable`, after denylist but before allowlist enforcement. |
| Unhandled request exception | Logs the request ID and returns a generic Anthropic-shaped 500. |
| Invalid/missing bearer | Returns a 401 Anthropic error envelope. |
| Unsupported route | Returns 404. |

The returned gateway handle exposes `stop()`, which calls `Bun.Server.stop(true)` and closes the store timers/SQL handle. It does not await already queued OTLP fan-out or create a global drain barrier across inference, admin writes, and telemetry. The gateway-specific source does not install its own `SIGINT`/`SIGTERM` handlers, so this artifact does not prove the exact signal-to-`stop()` path.

## Operator environment variables

| Variable | Scope | Effect |
|---|---|---|
| `CLAUDE_GATEWAY_LOG_LEVEL` | Gateway operator | Selects `debug`, `info`, `warn`, or `error` stderr logging; invalid/absent values use `info`. |
| `CLAUDE_GATEWAY_ALLOW_LOOPBACK` | Gateway operator, security-sensitive | Allows loopback/unspecified outbound targets that the SSRF guard normally blocks. Metadata/link-local special cases remain blocked. |

Secrets referenced through `${ENV}` or `${file:/absolute/path}` are consumed by config loading. Operators should avoid printing expanded config; the server's config event records only the config path and a hash of the validated object.

## Boundaries and caveats

- This is an embedded server in the `2.1.215` Linux/Bun bundle, not a claim about a separately supported deployment package or future protocol stability.
- Provider SDK internals and cloud-service behavior are not reconstructed here.
- `GET /protocol` serves a long embedded protocol guide, but this page relies on executable handlers rather than treating that prose as proof.
- A configured retention duration is not a deletion guarantee when the database role lacks permission or the process is not running.
- Source-visible `stop()` establishes an orderly closure API, not signal wiring or crash durability.

## Related docs

- [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md)
- [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md)
- [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md)
- [Settings schema reference](../03-tools-integrations-security/settings-schema-reference.md)
- [Telemetry and tracing](telemetry-and-tracing.md)
- [Environment variables reference](environment-variables-reference.md)
- [Command-line reference](../01-runtime-lifecycle/command-line-reference.md)
