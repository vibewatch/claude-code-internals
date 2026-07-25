# Remote-environment egress and file staging

Claude Code `2.1.215` contains a remote-runner integration that does more than attach to a hosted session. It can start a local HTTPS proxy backed by a policy-enforcing WebSocket tunnel, install the relay CA into common tool trust paths, synchronize a bounded working-file tree, fetch uploaded files into `/uploads`, and mediate MCP calls whose inputs and outputs live in synchronized file lanes.

This page owns those **remote-environment data-plane mechanisms**. It is separate from [Remote control and teleport](remote-control-and-teleport.md), which owns hosted session identity, replay, reconnect, and archival, and from [Sandbox and isolation](../03-tools-integrations-security/sandbox-and-isolation.md), which owns command policy/wrapping. The agent proxy described here is also not an ordinary user-configured `HTTP_PROXY`/`HTTPS_PROXY` client.

## Short answer

```mermaid
flowchart TD
    Remote[Remote runner startup] --> Proxy[initAgentProxy]
    Proxy --> Local[127.0.0.1 HTTPS CONNECT proxy]
    Local --> WS[WebSocket /v1/code/agent-proxy/ws]
    WS --> Egress[Policy-enforcing remote egress]
    Proxy --> Trust[CA bundle + JVM/NSS/Bazel/Boto/tool env]
    Proxy --> Git[Optional governed git/gh routing]

    Remote --> Sync[Working-file syncer]
    Sync <--> Lanes[/mnt/user-data/working ↔ /working]
    Remote --> Stage[/uploads staging]
    Stage --> Filestore[Filestore credential + readFile]
    Lanes --> MCP[Staged MCP input/output mediator]
    MCP --> Temp[Per-call in/out temp directory]
    Temp --> Lanes
```

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact symbol or string | Meaning |
|---|---:|---|---|
| AgentProxyTunnel | [~929,300–929,799](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L929300) | `CONNECT`, `/v1/code/agent-proxy/ws`, protocol version `2` | Tunnels local CONNECT streams over framed WebSockets with pooling and FIN control. |
| AgentProxyInit | [~930,088](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930088) | `initAgentProxy()` | Applies remote/session/token gates, fetches CA material, starts relay, and registers cleanup. |
| AgentProxyEnv | [~930,289](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930289) | `getAgentProxyEnv()` | Builds proxy, CA, Java, Git, GitHub, AWS, and Google child environment. |
| GovernedGit | [~930,365](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L930365) | `SgS()`, `EgS()` | Optionally appends session Git config and creates a `gh` PATH shim. |
| AgentProxyTrust | [~929,800–930,087](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L929800) | `X3f()`, `installIntoSystemTrust()` | Integrates relay CA with JVM, Bazel, NSS, Boto, profile, and system trust when possible. |
| AgentProxyStartupCaller | [~933,648](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L933648) | `registerAgentProxyEnvFn`, `await initAgentProxy()` | Starts the proxy during general initialization in remote mode and degrades on failure. |
| WorkingPathGuard | [~948,806](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L948806) | `relUnderSyncDir()`, `escapesSyncRoot()` | Requires absolute contained lane paths without NUL or `..`. |
| WorkingSyncApi | [~948,840](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L948840) | `/worker/synced_file`, `if_match_sha256` | Reads/writes the remote `/working` namespace with optimistic concurrency. |
| WorkingSyncer | [~949,258](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L949258) | `startSyncedFileSyncer()` | Scans/pushes the working tree with caps, concurrency, and retry backoff. |
| WorkingLaneWriter | [~949,397](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L949397) | `writeLaneRowFromWorker()` | Writes output lanes and mirrors locally only if the prior local state is still safe. |
| FileStage | [~949,576](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L949576) | `stageFile()`, `/uploads` | Stages ordinary filestore files or reconciles synchronized files. |
| FilestoreCredential | [~949,706](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L949706) | `GET /worker/files` | Mints the JWT/filesystem tuple consumed by filestore reads. |
| FilestoreRead | [~949,774](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L949774) | `fetchFilestoreToFile()`, `/v1/filestore/fs/readFile` | Streams a file with remint, stall, and truncation checks. |
| StagedMcpCall | [~950,070](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L950070) | `runStagedMcpCall()`, `{{in:NAME}}`, `{{out:NAME}}` | Materializes synchronized input/output lanes around one MCP call. |
| WorkingSyncStartup | [~950,800](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L950800) | `startSyncedFileSyncer(SYNCED_FILE_ROOT)` | Starts the syncer only in the eligible remote SDK/stream runner. |

## Agent-proxy activation

General initialization enters the proxy path only when `CLAUDE_CODE_REMOTE` is truthy. `initAgentProxy()` then requires:

- the internal `CCR_AGENT_PROXY_ENABLED` gate;
- `CLAUDE_CODE_REMOTE_SESSION_ID`; and
- either the session token at `/run/ccr/session_token`, the normal session-ingress credential, or the standalone `AGENT_PROXY_AUTH_TOKEN` override.

`AGENT_PROXY_URL` and `AGENT_PROXY_AUTH_TOKEN` are read and immediately removed from the process environment. They are host handoff inputs, not values intended to leak into tools. The token file is best-effort unlinked after successful setup.

The proxy base defaults to the CCR/Anthropic base URL. The client fetches `/v1/code/agent-proxy/ca-cert`, trying up to three times under one five-second abort signal, writes a combined system/customer/relay CA bundle, then starts a local listener on `127.0.0.1`. A failure logs/telemeters the reason and leaves proxy state disabled; remote startup continues.

## WebSocket CONNECT tunnel

The local endpoint accepts HTTPS `CONNECT` requests only. Plain HTTP/absolute-form traffic receives `405 Method Not Allowed`, with source text identifying common clients that mishandle HTTPS proxying.

For each accepted CONNECT stream, the proxy opens or reuses a WebSocket at:

```text
<vended base>/v1/code/agent-proxy/ws
```

On a fresh socket it sends a protocol-version control frame, then sends the original CONNECT line and relay authorization inside the framed data stream. The first tunneled bytes are treated as the upstream HTTP response; a 4xx/5xx status is recorded as a policy denial or upstream failure.

The tunnel has bounded buffering and retry behavior:

| Bound | Value in `2.1.215` |
|---|---:|
| WebSocket open timeout | 10 seconds |
| Fresh open attempts | 3 |
| Pending local request bytes | 32 MiB |
| WebSocket high/low water marks | 4 MiB / 1 MiB |
| Data-frame chunk | 512 KiB |
| Idle pooled tunnels | 4 |
| Pool idle TTL | 10 seconds |
| Pool maximum age | 45 minutes |
| FIN grace | 10 seconds |

Protocol v2 adds explicit FIN/ack behavior. A clean, established, fully closed v2 tunnel can return to the pool; unresponsive pooled sockets fall through to a fresh dial only while no response has been established. Once a stream is established, unexpected closure terminates the local side rather than replaying arbitrary bytes over a new tunnel.

This is not an HTTP caching proxy or raw-TCP service. The embedded operator guidance explicitly excludes plain HTTP, gRPC/HTTP2-only APIs, WebSocket upgrades, client mTLS, pinning, many non-443 targets, and raw databases.

## Child environment and trust integration

In ordinary mode, `getAgentProxyEnv()` supplies children with:

- `HTTPS_PROXY`/`https_proxy` pointing at the local listener;
- a computed `NO_PROXY`/`no_proxy` set;
- common CA environment variables pointing at the combined bundle;
- `JAVA_TOOL_OPTIONS` when a generated truststore is available;
- noninteractive Git credential defaults; and
- placeholder GitHub/AWS/Google credential variables when the specific credential env checks in this path find no matching source.

The placeholder values are expected to be interpreted by the governed relay path; they are not customer secrets. For ordinary child env, GitHub placeholders are suppressed only by existing `GH_TOKEN` or `GITHUB_TOKEN`. AWS checks a longer explicit credential/profile/metadata-variable list, while Google checks `CLOUDSDK_AUTH_ACCESS_TOKEN` or `GOOGLE_APPLICATION_CREDENTIALS`. This is not a generic “any cloud credential” detector. The separate `gh` shim additionally bypasses the relay for `GH_ENTERPRISE_TOKEN` and `GITHUB_ENTERPRISE_TOKEN`.

Best-effort trust setup can:

- install the CA in a writable system trust directory and run the platform refresh command;
- clone JDK `cacerts` into a per-session PKCS#12 store and inject it through Java/Bazel settings;
- add the CA to NSS databases;
- create a Boto config for `gsutil`; and
- write a profile script containing set-if-absent CA variables, deliberately excluding the ephemeral proxy port.

Failures are recorded as status codes and degrade to environment-variable trust rather than aborting the whole proxy. The generated README/status surface tells operators not to disable TLS verification or route around policy denials. In tool-scoped mode, this broad proxy/CA/JVM/Bazel/NSS/Boto environment and trust-store setup is skipped; child-env injection is reduced to an optional `PATH` prepend for the generated `gh` shim.

## Governed Git and `gh`

Tool-scoped mode is enabled by the internal Git-config or `gh`-shim arms. In that mode the general proxy environment is not injected into every child; only session Git/GitHub routing is prepared.

`SgS()` writes only when `GIT_CONFIG_GLOBAL` is set, so it refuses to discover and modify the default shared global config implicitly. It trusts the caller-provided path, however, and does not prove that the named file is session-specific before appending a marked block scoped to `https://github.com/`. SSH-form GitHub remotes can be rewritten to HTTPS only when the session has no standalone proxy override, `SSH_AUTH_SOCK`, or `GIT_SSH_COMMAND`.

`EgS()` locates the real `gh`, writes a per-session wrapper, and prepends its directory to `PATH`. The wrapper bypasses the relay when it sees:

- a real GitHub/GitHub Enterprise credential;
- a non-`github.com` `GH_HOST`/`--hostname` target;
- an explicit non-GitHub repository host; or
- a checkout whose origin resolves to a non-GitHub host.

Thus the shim does not intentionally send customer GitHub Enterprise credentials through the hosted relay. For eligible `github.com` calls it clears `NO_PROXY`, applies the local proxy/CA, and uses placeholder GitHub tokens. Tool-scoped routing is prepared by initialization side effects—the managed gitconfig block and/or generated wrapper—rather than by exporting the normal proxy/CA environment to every child.

## Working-file namespaces

The working-file system joins two namespaces:

| Side | Root |
|---|---|
| Runner filesystem | `/mnt/user-data/working` |
| Synced-file API | `/working` |

`relUnderSyncDir()` accepts only an absolute path strictly below the relevant root. It rejects NUL bytes, the root itself, absolute relative results, and `..` components. Files/directories with a dot-prefixed component, editor backup suffix, `.swp`, or `.tmp` are ignored by the background syncer.

Remote rows are read and written through `/worker/synced_file`. PUT sends base64 content, the worker epoch, and optional `if_match_sha256`; 409 is a first-class conflict result. GET distinguishes not-found from transport failure. Timeouts, network errors, 408, 429, and 5xx are retryable; auth and ordinary client errors are not. `NO_PROXY` also differs by mode: ordinary relay setup includes private-network/cluster-local bypasses, while standalone `AGENT_PROXY_URL` mode uses a narrower list.

## Background working sync

The syncer starts only when the headless/SDK remote runner has an SDK URL and remote session ID, is not a specialized environment kind, and `CLAUDE_CODE_DISABLE_WORKING_SYNC` is unset. This is host wiring; it is not a general local-directory sync feature.

The scanner:

- polls every five seconds;
- backs retryable transport failure off exponentially to two minutes;
- examines at most 4,096 entries per scan;
- pushes at most four files concurrently; and
- accepts regular files no larger than 25 MiB.

The ignored-path predicate is shared beyond scanning. Synced-file staging rejects an ignored `mount_path`, and a worker output row at an ignored relative path can succeed remotely without being mirrored back into the local tree.

Reads use `O_NOFOLLOW | O_NONBLOCK`; realpaths and ancestor checks reject symlink escapes. Writes use a mode-`0600` temporary file and rename after checking that existing parents and destinations remain below the sync root.

The initial cold reconciliation is deliberately remote-authoritative when both local and remote content exist and no prior seen-state can establish lineage: the remote row overwrites the local file and is recorded as `cold_renderer_wins`. Later local writes use the last seen ETag. A 409 fetches the canonical remote row and overwrites the local conflict. This is optimistic synchronization, not an offline merge algorithm.

Seen-state eviction preserves a bounded ETag hint for later `if_match` use. A capped or failed directory scan avoids interpreting unseen entries as deletions. Stopping the syncer clears its interval; `flushSyncedFiles()`/`drainSyncedFiles()` coordinate pending work when explicitly called.

## `/uploads` filestore staging

Ordinary staging requires an absolute `mount_path` below `/uploads`. The destination is under the runtime's configured stage root; realpath checks ensure the parent remains contained. Existing regular files are a no-op unless `force` is set.

The ordinary `/uploads` path first calls `GET /worker/files` for a short-lived `filestore_jwt` and `filesystem_id`, then streams `POST /v1/filestore/fs/readFile` to disk. It has no total read deadline but aborts if no bytes arrive for 60 seconds. A first 401 remints credentials once and retries. When `Content-Length` is present, the completed file size must match or the stage is rejected as truncated.

The download lands in a temporary file, is changed to mode `0444`, and is renamed into place. Temporary files are removed on known failures. On a read-only mounted environment, `EROFS` is treated as a successful `readonly_mount` no-op only when `CLAUDE_STAGE_FILE_ROOT` was not explicitly set; an explicit root turns the same condition into an error.

When a stage request carries `filestore_path`, it takes the synchronized-file reconciliation lane instead. Its filestore helper fetches an in-memory arraybuffer with a 30-second request timeout and 64 MiB transport cap; it does **not** use the streamed path's 401 remint loop, no-byte stall watchdog, or `Content-Length` truncation check. The reconciliation lane is rejected for runner kinds that set `CLAUDE_CODE_ENVIRONMENT_KIND`, applies its own 25 MiB working-file cap, and protects a local edit that changes during the fetch window by pushing/re-reading before committing canonical content.

## Staged MCP file calls

`runStagedMcpCall()` mediates a tool call whose file arguments refer to synchronized lanes. It is unsupported on Windows in this build.

The request can declare:

- `input_files` with `/working/...` lane paths;
- `output_files` with lane paths and optional `if_match` ETags;
- `arguments` containing exact `{{in:NAME}}` or `{{out:NAME}}` tokens;
- `expires_at`; and
- a bounded `timeout_ms`.

Output declarations require an RFC 3339 timestamp with a zone, and expired calls stop before tool execution. Validation rejects duplicate input names, duplicate output names, and duplicate **output** lane paths. It does not independently reject duplicate input lane paths or an input/output name collision across the two lists in this path. Undeclared tokens are rejected, and every declared output must be referenced by the argument object.

For one call, the runtime creates:

```text
plugin-tool-*/
  in/
  out/
```

It fetches each input row, writes mode-`0600` temporary input files, substitutes local paths into the MCP arguments, and runs the call with `dontAsk`-independent tool mediation supplied by the caller. Timeout values are clamped between one second and ten minutes, with a two-minute default.

Before publishing each output, the collector verifies that it:

- exists below the staging root after `realpath`;
- is a regular file;
- has one hard link;
- is no larger than 25 MiB; and
- does not change size while being read.

`writeLaneRowFromWorker()` writes the remote row with optional optimistic concurrency. After remote success it mirrors locally only if the local file still matches the previously seen hash. If local state changed, remote success is retained and the local overwrite is skipped. The response returns lane path, ETag, and byte count plus the wrapped MCP result.

The per-call temporary directory is recursively removed in `finally`, including error, timeout, and cancellation paths. Successful remote lane writes are not rolled back if a later output or cleanup fails; staged MCP is not a multi-output transaction.

## Activation and internal environment

These variables are visible in the executable path, but most are host-to-worker protocol rather than supported operator configuration:

| Variable | Classification | Role |
|---|---|---|
| `CLAUDE_CODE_REMOTE` | Host/internal mode signal | Enables remote-runner initialization. |
| `CCR_AGENT_PROXY_ENABLED` | Host/internal gate | Enables the agent-proxy branch. |
| `CLAUDE_CODE_REMOTE_SESSION_ID` | Host/session identity | Required by proxy and stage operations. |
| `AGENT_PROXY_URL`, `AGENT_PROXY_AUTH_TOKEN` | Sensitive host handoff | Optional standalone relay override; scrubbed from process env immediately. |
| `CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG`, `CLAUDE_CODE_AGENT_PROXY_GH_SHIM` | Internal deployment arms | Select governed Git/`gh` tool-scoped setup. |
| `CLAUDE_CODE_DISABLE_WORKING_SYNC` | Internal kill switch | Suppresses background working-file sync. |
| `CLAUDE_CODE_ENVIRONMENT_KIND` | Host runner classification | Disables syncer/synced staging on specialized runner kinds. |
| `CLAUDE_CODE_WORKER_EPOCH` | Host protocol field | Included in synced-file writes. |
| `CLAUDE_STAGE_FILE_ROOT` | Host stage-root override | Changes destination behavior and disables implicit read-only no-op semantics. |

The [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md) lists only variables useful for understanding or operating this build and labels internal handoffs explicitly; source visibility does not make them stable public API.

## Failure and cleanup summary

| Failure | Source-confirmed outcome |
|---|---|
| No remote session/token or proxy gate off | Proxy remains disabled; startup continues. |
| CA fetch or local listener setup fails | Logs/telemeters failure and continues without agent proxy. |
| Trust integration fails | Child env/bundle remains primary trust path; status records partial failures. |
| CONNECT tunnel cannot open | Bounded retries, then local 502 and channel cleanup. |
| Working sync retryable API failure | Polling backs off; non-retryable rejection does not spin indefinitely. |
| Symlink/containment/size violation | File is skipped or request fails before remote/local write. |
| Filestore 401 | Remint once; a second failure is returned. |
| Filestore stalls/truncates | Temporary file is rejected/removed by the stage path. |
| Staged MCP tool/output failure | Structured staging error; temp tree removed; already published lanes are not rolled back. |

The agent-proxy listener is registered with the process cleanup coordinator. Generated `gh` and profile files have cleanup callbacks; CA/system-trust modifications are not universally rolled back by this path. The working syncer exposes explicit stop/flush controls, but source does not establish a crash-safe checkpoint joining local files, remote ETags, and process shutdown.

## Boundaries and caveats

- Server-side egress policy, filestore implementation, JWT minting, and synchronized-row retention are outside this client bundle.
- Internal environment names and endpoints are documented to explain the retained artifact, not promised as user-facing contracts.
- Hash/ETag reconciliation prevents selected lost updates; it does not provide distributed filesystem semantics or atomic multi-file commits.
- Tool trust setup mutates environment/config/trust stores best-effort. Exact availability depends on image permissions and installed utilities.
- The local agent proxy handles HTTPS CONNECT; it is not the enterprise inference gateway documented in [Enterprise gateway server](../05-hosted-agent-ops/enterprise-gateway.md).

## Related docs

- [Remote control and teleport](remote-control-and-teleport.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Sandbox and isolation](../03-tools-integrations-security/sandbox-and-isolation.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
- [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md)
- [Runtime communication protocols](../00-start-here/runtime-communication-protocols.md)
