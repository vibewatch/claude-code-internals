# MCP, plugins, and hooks

This page reverse-engineers the MCP, plugin, and hook surfaces in the analyzed `cli.renamed.js`.

Use [Plugin lifecycle and configuration](plugin-lifecycle-and-configuration.md) for manifests, source/enablement precedence, dependency constraints, plugin defaults, and `userConfig`; [Hooks and events reference](hooks-and-events-reference.md) for the canonical hook/frame/method list; and [Tool inventory and schemas](tool-inventory-and-schemas.md) for MCP/plugin tool schema ownership. This page owns marketplace acquisition plus MCP/plugin/hook runtime wiring.

Specialized dynamic MCP integrations have separate owners: [Browser automation and Claude in Chrome](browser-automation-and-claude-in-chrome.md) and the IDE half of [IDE integration and LSP diagnostics](ide-integration-and-lsp-diagnostics.md).

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| McpCommandRegistrar | `function rR4(H)` | Registers the `mcp` command family. |
| McpServeCommand | `command("serve")` | Starts the Claude Code MCP server. |
| McpListCommand | `command("list")` | Lists configured MCP servers. |
| McpDesktopImportCommand | `command("add-from-claude-desktop")` | Imports MCP servers from Claude Desktop. |
| McpProjectChoiceReset | `reset-project-choices` | Resets approved/rejected project-scoped MCP choices. |
| McpNonblockingGate | `MCP_CONNECTION_NONBLOCKING` | Runtime MCP connection non-blocking gate. |
| McpToolTimeout | `MCP_TIMEOUT` | MCP tool timeout environment variable. |
| McpAutoBackground | `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | Moves MCP calls that exceed the configured foreground threshold into background task handling. |
| McpRoots | `roots/list`, `notifications/roots/list_changed` | Publishes the current/additional working directories and announces root-set changes. |
| McpPendingWait | `WaitForMcpServers` | Waits briefly for pending MCP servers and classifies connected, failed, auth, disabled, unconfigured, and unknown names. |
| McpToolRefresh | `RefreshMcpTools` | Re-queries tool lists on already connected servers without dialing. |
| McpRefreshEnvGate | `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` | Adds the refresh descriptor to the base tool pool. |
| McpIdleTimeout | `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` | Global no-response/no-progress watchdog; zero disables it. |
| HostedConnectorDiscovery | `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors` | Searches hosted connector metadata, resolves suggestion payloads, or lists installed organization connectors. |
| HostedPluginSkillDiscovery | `ListPlugins`, `SearchPlugins`, `SuggestPluginInstall`, `ListSkills`, `SearchSkills`, `SuggestSkills` | Lists/searches hosted account catalogs and renders out-of-band action cards. |
| ComputerUseMcp | `serverName = "computer-use"`, `--computer-use-mcp` | macOS-only dynamic MCP server with a separate application-control policy layer. |
| McpConfigFlag | `--mcp-config <configs...>` | Loads MCP config from JSON files or strings. |
| StrictMcpConfigFlag | `--strict-mcp-config` | Ignores non-flag MCP configurations. |
| PluginCommandRegistrar | `function fC4(H)` | Registers `plugin` / `plugins` command family. |
| PluginTuiManager | `description:"Manage Claude Code plugins"` | In-session slash/TUI plugin management surface. |
| PluginMarketplaceCommand | `Manage Claude Code marketplaces` | CLI marketplace subcommand root. |
| PluginMarketplaceAddCommand | `Add a marketplace from a URL, path, or GitHub repo` | Marketplace add command and source ingestion surface. |
| EnabledPluginsSetting | `enabledPlugins` | Settings key storing enabled plugin IDs and version constraints. |
| ExtraMarketplacesSetting | `extraKnownMarketplaces` | Settings key registering repository/team marketplaces. |
| StrictMarketplacePolicy | `strictKnownMarketplaces` | Managed allowlist for marketplace sources. |
| BlockedMarketplacePolicy | `blockedMarketplaces` | Managed blocklist for marketplace sources. |
| DependencyMarketplacePolicyBlock | `dependency-marketplace-blocked-by-policy` | Plugin dependency install can be blocked by marketplace policy. |
| PluginInstallTelemetry | `plugin_installed` | Plugin install telemetry after dependency resolution and settings write. |
| PluginUninstallTelemetry | `tengu_plugin_uninstalled_cli` | CLI uninstall telemetry and orphan-scan follow-up. |
| PluginDisableTelemetry | `tengu_plugin_disabled_cli` | CLI disable telemetry. |
| PluginUpdateTelemetry | `tengu_plugin_updated_cli` | CLI update telemetry after version check. |
| PluginCacheStaging | `generateTemporaryCacheNameForPlugin`, `cachePlugin` | Plugin sources are staged in a temporary cache directory before manifest validation. |
| PluginManifestLoad | `loadPluginManifest` | Cache materialization depends on `.claude-plugin/plugin.json` or alternate manifest paths. |
| MarketplaceDeclarations | `extraKnownMarketplaces`, `sQ`, `Uhy`, `bJr` | Merged, scoped settings declarations; distinct from downloaded/materialized state. |
| MarketplaceStateFile | `known_marketplaces.json`, `Ng`, `lxe` | Validated local records containing source, install location, and update metadata. |
| MarketplaceMaterializer | `cct`, `bSs` | Policy-checks, de-duplicates, acquires, validates, caches, and records a marketplace source. |
| MarketplaceRemoval | `DDt` | Removes one declaration or, on final removal, state/cache/plugin records. |
| MarketplaceTargetedBulkUpdate | `marketplaceUpdateHandler`, `tengu_marketplace_updated_all` | Marketplace update has targeted and all-marketplace branches. |
| HookEventSchema | `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd` | Hook event schema. |
| ReloadPluginsCommand | `reload-plugins`, `wId()`, `Dze()` | Computes MCP cache impact, rebuilds plugin contributions, and can repair missing dependencies [~559,800–560,050](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L559800). |
| ReloadSkillsCommand | `reload-skills`, `getSkillToolCommands`, `clearCommandsCache` | Re-enumerates filesystem skills and reports name-set changes [~560,050–560,085](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L560050). |
| SkillDoctorCommand | `skill-doctor`, `LMt()`, `Fqy()` | Reports unused loaded user skills and stale user-installed plugins [~563,760–563,930](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L563760). |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line(s) | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `McpChromeBridge` | 13823, 13838, 39107, 39134 | `createBridgeClient`, `createClaudeForChromeMcpServer`, `createChromeSocketClient`, `BridgeClient`, `BROWSER_TOOLS`, `ToolCallTimeoutError`, `SocketConnectionError`, `NoExtensionConnectedError`, `ExtensionDisconnectedMidCallError`, `DISCOVERY_TIMEOUT_MS`, `PEER_WAIT_TIMEOUT_MS`, `WAIT_MAX_DURATION_S` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |
| `McpbExtensionPackaging` | 268617, 271802, 271894, 272295, 272401 | `verifyMcpbFile`, `signMcpbFile`, `unsignMcpbFile`, `unpackExtension`, `verifyCertificateChain`, `validateManifest`, `readMcpbIgnorePatterns`, `readPackageJson`, `replaceVariables`, `shouldExclude`, `promptVisualAssets`, `promptUserConfig` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |
| `PluginLoader` | 276711 | `loadAllPlugins`, `loadAllPluginsCacheOnly`, `loadPluginManifest`, `loadSkillsAsPlugins`, `resolvePluginPath`, `resolveContainedPluginPath`, `mergePluginSources`, `probeSeedCacheAnyVersion` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |
| `PluginCommandHandlers` | 644148 | `pluginInstallHandler`, `pluginUninstallHandler`, `pluginListHandler`, `pluginInitHandler`, `pluginTagHandler`, `pluginPruneHandler`, `pluginValidateHandler`, `pluginUpdateHandler` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |
| `HookEventDispatcher` | 629735 | `shouldSkipHookDueToTrust`, `hasWorktreeCreateHook`, `hasInstructionsLoadedHook`, `getUserPromptSubmitHookBlockingMessage`, `persistHookOutput`, `parseElicitationHookOutput`, `getTaskCreatedHookMessage`, `getTaskCompletedHookMessage` | [Bundle module map — permission, trust, hooks, and policy](../99-research-atlas/module-map-from-renamed-cli.md#permission-trust-hooks-and-policy) |

## MCP runtime map

```mermaid
flowchart TD
    Flags[--mcp-config / --strict-mcp-config] --> Config[MCP config set]
    Settings[settings / project / managed policy] --> Config
    Plugins[plugin-provided MCP] --> Config
    Config --> Coordinator[MCP runtime coordinator]
    Coordinator --> Always[alwaysLoad servers]
    Coordinator --> Deferred[non-alwaysLoad servers]
    Coordinator --> ClaudeAi[claude.ai connectors]
    Coordinator --> Tools[MCP tools/resources/prompts]
    Coordinator --> Pending[WaitForMcpServers]
    Tools --> Refresh[RefreshMcpTools]
    ClaudeAi --> Discovery[connector/plugin/skill discovery]
    Config --> Computer[computer-use dynamic MCP on macOS]
```

`McpRuntimeCoordinator` splits regular configs into always-load and non-always-load groups, honors `MCP_CONNECTION_NONBLOCKING`, connects regular and claude.ai connector configs, and deduplicates overlapping plugin/connector surfaces.

## MCP command surface

| Subcommand | Runtime role |
|---|---|
| `serve` | Starts Claude Code's MCP server. |
| `list` | Lists configured MCP servers; help text warns that stdio servers can be spawned for health checks. |
| `add`, `remove`, `get`, `add-json` | Present in the command family by surrounding command registration, though individual anchors are less stable than `McpCommandRegistrar`. |
| `add-from-claude-desktop` | Imports MCP servers from Claude Desktop on supported platforms. |
| `reset-project-choices` | Clears project-scoped approve/reject choices for `.mcp.json` servers. |
| `login <name>` / `logout <name>` | Authenticates or clears one MCP server without opening the interactive `/mcp` menu; `--no-browser` supports SSH/manual completion. |

## Plugin surfaces

`PluginCommandRegistrar` registers `plugin` / `plugins`. High-signal plugin strings show:

- session-only plugins through `--plugin-dir` and `--plugin-url`;
- marketplace concepts and reserved marketplace names;
- plugin-provided `agents`, `skills`, `hooks`, `mcpServers`, and `outputStyles` schema surfaces;
- plugin autoupdate guarded by updater state.

Current CLI handlers also expose `plugin init <name>` (scaffold under `.claude/skills`), `plugin list` with enabled/disabled filters, `plugin prune` / `uninstall --prune` for orphaned dependencies, and `plugin tag` for validated release tags. Nested `.claude/skills` directories load contextually; name collisions are qualified with their directory.

These command surfaces manipulate several independent state layers. Marketplace declarations/materialization are documented below; installation records, scoped `enabledPlugins`, manifest contribution loading, plugin-owned defaults, dependency/version constraints, and sensitive/non-sensitive `userConfig` storage are traced in [Plugin lifecycle and configuration](plugin-lifecycle-and-configuration.md).

## Plugin marketplace lifecycle

The plugin path has two user-facing entry surfaces: an in-session slash/TUI plugin menu and the CLI `plugin` / `plugins` command family. The CLI command tree registers four source-visible handlers—`marketplaceAddHandler`, `marketplaceListHandler`, `marketplaceRemoveHandler`, and `marketplaceUpdateHandler`—around `cli.renamed.js:657137-657390`, with the `plugin marketplace add|list|remove|update` commands around `660963-661030`.

The durable lifecycle has **two independent layers**:

| Layer | Owner | Contents and role |
|---|---|---|
| Declaration | `extraKnownMarketplaces` in user/project/local/flag/policy settings; merged by `sQ` / `Uhy`; written by `bJr` | Says that a named marketplace source is declared in a particular scope. Multiple scopes can declare the same name. |
| Materialized state | `~/.claude/plugins/known_marketplaces.json` path from `Uyo`; loaded by `Ng`; validated/written by `lxe` | Records the resolved source, `installLocation`, `lastUpdated`, and optional update state for a locally usable marketplace. |

This distinction is observable in the add handler: it first calls `cct` to materialize and record the source, then calls `bJr` to write the selected declaration. Those writes are not one transaction; the visible handler does not roll back materialized state if the later settings write fails.

```mermaid
flowchart TD
    Source[Marketplace source] --> Policy[strict / blocked source policy]
    Policy --> Materialize[cct -> bSs]
    Materialize --> State[known_marketplaces.json]
    Materialize --> Cache[validated marketplace cache or local path]
    State --> Declare[bJr -> extraKnownMarketplaces scope]
    Declare --> Catalog[Usable marketplace catalog]
    Cache --> Catalog
    Catalog --> Install[Install plugin + dependencies]
    Install --> Enabled[enabledPlugins setting]
    Enabled --> Runtime[hooks / MCP / skills / agents / output styles]
    Runtime --> Reload[plugin-affecting settings reload]
```

| Stage | Source-visible evidence | Runtime implication |
|---|---|---|
| Add and declare | `marketplaceAddHandler`, `cct`, `bJr`, `--scope`, `--sparse` | The source is policy-checked/materialized first, then declared in user/project/local settings. Sparse paths apply only to GitHub/Git sources. An equivalent materialized source is reused. |
| List | `marketplaceListHandler`, `Ng` | CLI list reads materialized `known_marketplaces.json` entries, not merely the merged declarations. JSON output includes source-specific fields and `installLocation`. |
| Apply policy | `strictKnownMarketplaces`, `blockedMarketplaces`, `dependency-marketplace-blocked-by-policy` | Managed policy can allowlist or block sources before plugin/dependency installation completes. |
| Install plugin | `plugin_installed`, dependency closure handling, `enabledPlugins` writes | Install resolves dependency closure, writes enabled plugin state, and emits plugin/marketplace telemetry. |
| Update marketplace | `marketplaceUpdateHandler`, `cxe` / `Zhy`, `Drd` | A named update refreshes one state entry; no name refreshes all eligible entries. Seed-managed, settings-sourced, and policy-blocked cases have explicit skip/error behavior. |
| Remove one declaration | `DDt(name, scope)` | If another editable scope, managed policy, or seed still declares the name, only that scope's declaration is removed; materialized state and installed plugins remain. |
| Final removal | `DDt(name)` or removal of the last declaration | Deletes the state entry and cache, strips declarations and marketplace-specific `enabledPlugins`, removes installed-plugin records, and marks orphaned paths for cleanup. |
| Runtime contribution | plugin `hooks`, `mcpServers`, `skills`, `agents`, `outputStyles` | Enabled plugins become capability injectors, but still flow through settings, hooks, MCP, and permission boundaries. |

`bSs` implements URL, GitHub, generic Git, local file, local directory, and settings-backed synthetic-manifest acquisition (`cli.renamed.js:467471-467675`). Although the source schema and formatter recognize an `npm` marketplace source, that branch explicitly throws `NPM marketplace sources not yet implemented`. Schema presence is therefore not implementation evidence. This limitation is specific to **marketplace acquisition**.

Seed ownership is another separate layer. An unscoped attempt to permanently remove a seed-managed marketplace is rejected because startup would restore it. Scoped removal can still remove a matching editable declaration while retaining the seed-backed materialization.

### Plugin cache staging

The decoded plugin-cache chunk shows a write-then-validate flow. `cachePlugin` creates a temporary cache directory under the plugin cache root, copies or installs the source there, then calls `loadPluginManifest` before returning a materialized plugin record. The observed temporary name includes source kind, timestamp, and a random suffix (`temp_<source>_<time>_<rand>`), but the stable behavior to rely on is the staging boundary: source acquisition happens before manifest validation and final cache reuse.

Supported **plugin package** source branches include local copies, npm packages, GitHub/git URLs, and git subdirectories. This does not imply support for an NPM **marketplace source**: the marketplace materializer's NPM branch throws as described above. The same plugin-cache chunk also preserves safety details such as contained path resolution, safe symlink handling during local copy, and POSIX filtering for exported plugin `bin` paths.

`marketplaceUpdateHandler` has two visible branches: a named marketplace update emits `tengu_marketplace_updated`, while the no-name branch loads all configured marketplaces and emits `tengu_marketplace_updated_all` with a count. Individual plugin update still delegates to a lower-level updater, so this page documents the update surface and telemetry rather than every update/install branch.

## Hook events

The hook schema includes these high-signal lifecycle events:

| Hook family | Examples |
|---|---|
| Tool lifecycle | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` |
| Prompt/session lifecycle | `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `SessionEnd` |
| Stop/compaction | `Stop`, `StopFailure`, `PreCompact`, `PostCompact` |
| Agent/task lifecycle | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted` |
| Permission/config/worktree | `PermissionRequest`, `PermissionDenied`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove` |

## Security interpretation

MCP and plugins extend model-visible capabilities, but they do not bypass the rest of the runtime. The same command surface also exposes strict config, project-choice reset, hook validation, timeouts, and permission-prompt routing, which indicates that external capabilities are integrated through guarded runtime boundaries.

## MCP runtime internals

This section separates MCP command management from runtime MCP connection and event handling.

### Additional anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| McpRuntimeCoordinator | `function fH9(H)` | Runtime MCP connection coordinator. |
| RequiredMcpConfigSplit | `alwaysLoad===!0` | Split between required and normal MCP configs. |
| RequiredMcpConnectLabel | `--mcp-config alwaysLoad servers` | Required MCP config connect label. |
| ClaudeAiConnectorLabel | `claude.ai connectors` | Runtime connector connect label. |
| McpToolsListSchema | `tools/list` | MCP tools/list protocol schema. |
| McpResourceListSchemas | `resources/list`, `resources/templates/list` | MCP resource listing schemas. |
| McpPromptSchemas | `prompts/list`, `prompts/get` | MCP prompt listing/get schemas. |
| McpToolTimeoutEnv | `MCP_TIMEOUT` | MCP tool timeout env var, defaulting to 30000 ms. |
| McpConnectTimeoutEnv | `MCP_CONNECT_TIMEOUT_MS` | MCP connection timeout env var, defaulting to 5000 ms. |
| McpAuthErrorTelemetry | `tengu_mcp_tool_call_auth_error` | MCP tool-call auth-expiry telemetry/error path. |
| McpElicitationFrame | `elicitation_complete` | MCP elicitation completion is bridged into headless frames. |

### Runtime coordinator

The complete `McpRuntimeCoordinator` function is small enough to reconstruct:

1. Receives `regularMcpConfigs`, `claudeaiConfigPromise`, and state.
2. Computes a non-blocking flag from `MCP_CONNECTION_NONBLOCKING` or an explicit `nonBlocking` option.
3. Stores the non-blocking state through `IV8(_)`.
4. Partitions regular MCP configs into `alwaysLoad === true` and all other configs.
5. Returned `connect()` starts two parallel connection groups: regular configs via `Br6(...)` and claude.ai connectors via `kKA(...)` after `claudeaiConfigPromise` resolves.
6. Records startup markers `before_mcp_connect_user`, `before_mcp_connect_connector`, `after_mcp_connect_user`, `after_mcp_connect_connector`.

```mermaid
flowchart TD
    Input[regularMcpConfigs + claudeaiConfigPromise] --> NonBlocking[MCP_CONNECTION_NONBLOCKING]
    Input --> Split[split alwaysLoad vs normal]
    Split --> Required[alwaysLoad servers]
    Split --> Normal[regular servers]
    Input --> Connectors[claude.ai connectors]
    Required --> Connect[connect() Promise.all]
    Normal --> Connect
    Connectors --> Connect
```

### Required versus non-required servers

The `alwaysLoad` split is important. Required servers are labeled `--mcp-config alwaysLoad servers` and normal servers as `--mcp-config servers`. Required servers are connected as a distinct group; normal servers can honor non-blocking/deferred behavior; claude.ai connectors are a separate promise-driven group. Because `connect()` awaits both groups, the final headless startup waits for the coordinator as a whole even when parts are internally non-blocking.

### Pending-server wait and live refresh

`WaitForMcpServers` and `RefreshMcpTools` solve different readiness problems:

| Tool | Use when | What it does not do |
|---|---|---|
| `WaitForMcpServers` | One or more configured clients are still `pending` and the needed tools have not joined the tool set. | Does not configure, enable, or authenticate a server. |
| `RefreshMcpTools` | A connected server's `tools/list` view may be stale after an app/device change or missed notification. | Does not dial or reconnect a disconnected client. |

`WaitForMcpServers` is dynamically visible only while a supported model/session has pending clients. It waits for selected server names—or all pending names—for at most five seconds, then returns `ready` plus `connected`, `failed`, `stillPending`, `needsAuth`, `disabled`, optional `unconfigured`, and `unknown` arrays. A retry cannot fix `unconfigured`; the user must provide a server URL/config. `needsAuth` and `disabled` route the user to `/mcp`.

`RefreshMcpTools` is added to the base pool only when `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` is true. On a connected client it immediately updates the available tool set and reports added/removed names; on failure it preserves the previous set.

### MCP protocol surfaces

| Protocol method | Role |
|---|---|
| `tools/list` | Lists tools exposed by an MCP server. |
| `resources/list` | Lists resources. |
| `resources/templates/list` | Lists resource templates. |
| `prompts/list` | Lists prompts. |
| `prompts/get` | Retrieves a prompt by name/arguments. |
| `roots/list` | Returns current and additional working directories exposed as MCP roots. |
| `notifications/roots/list_changed` | Announces a changed root set after `/add-dir`, `/cd`, or equivalent runtime updates. |

These schema anchors are paired with runtime anchors in `McpRuntimeCoordinator`, `McpCommandRegistrar`, `HeadlessControlLoop`, and MCP tool-call error handling, confirming MCP as both a command/config system and a runtime capability provider.

### Hosted connector, plugin, and skill discovery

The runtime also carries first-party hosted discovery descriptors. They are enabled only in the first-party remote/hosted environment (`CLAUDE_CODE_REMOTE` plus first-party provider), so they should not be treated as universal local MCP/plugin commands.

```mermaid
flowchart LR
    Intent[User intent] --> Search[SearchMcpRegistry]
    Search --> UUIDs[directoryUuid results]
    UUIDs --> Suggest[SuggestConnectors]
    Installed[ListConnectors] --> SessionState[connected + enabledInChat]
    Plugins[SearchPlugins] --> PluginCard[SuggestPluginInstall]
    Skills[SearchSkills] --> SkillCard[SuggestSkills]
    ExistingPlugins[ListPlugins] --> PluginCard
    ExistingSkills[ListSkills] --> SkillCard
```

- `SearchMcpRegistry` returns ranked connector records with org-level `installState` and session-level `enabledInChat`.
- `SuggestConnectors` accepts only UUIDs returned by registry search and resolves full card payloads; it does not connect anything.
- `ListConnectors` lists installed organization connectors. `connected: true` with `enabledInChat: false` means authenticated but disabled for this chat.
- `ListPlugins`/`ListSkills` inspect enabled claude.ai capabilities; `SearchPlugins`/`SearchSkills` search hosted catalogs.
- `SuggestPluginInstall` and `SuggestSkills` render cards. Installation/enablement happens out of band and must be confirmed later by a list call.

These surfaces are distinct from the local plugin marketplace/cache lifecycle below and from filesystem `SKILL.md` discovery. See [Skills system](skills-system.md#hosted-skill-discovery-and-proposals) for the skill-specific handoff.

### Timeout and auth-error mechanics

- `MCP_TIMEOUT` → tool-call timeout, falling back to `30000` ms.
- `MCP_CONNECT_TIMEOUT_MS` → connection timeout, falling back to `5000` ms.
- `MCP_TOOL_TIMEOUT` → hard wall-clock tool-call timeout. Per-server `timeout` values at or above one second take precedence; progress does not extend the hard deadline.
- `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` → no-response/no-progress watchdog. Defaults are 30 minutes for stdio and 5 minutes for HTTP/SSE-like transports, bounded by the hard timeout; `0` disables it. IDE/SDK transports are exempt.
- Per-server `request_timeout_ms` overrides the normal request timeout for configs loaded from `.mcp.json` or `--mcp-config`.
- `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` controls the foreground threshold; the shipped behavior moves calls running longer than two minutes to the background so the session remains usable. Set a different millisecond value or disable according to the env parser contract.

`RefreshMcpTools` keeps the prior tool set when refresh fails and reports `refreshed`, `error`, or `not_connected` plus tool-count/add/remove details. It intentionally never dials a disconnected server.

The MCP tool-call error path has a specific auth branch: on `401` or token-expiry-like errors, the runtime emits `tengu_mcp_tool_call_auth_error` and raises a user-facing error requiring re-authorization.

### Elicitation and headless integration

MCP elicitation completion is visible in two places: the MCP client handles an elicitation completion notification and marks queued elicitation state as complete; `HeadlessControlLoop` emits `system` / `elicitation_complete` frames with `mcp_server_name` and `elicitation_id`. URL-mode elicitation is observable as a headless/SDK stream frame.

### Command tree versus runtime connection

| Surface | Function | Role |
|---|---|---|
| `claude mcp ...` | `McpCommandRegistrar` | Manage config and run the MCP server. |
| root action headless setup | `McpRuntimeCoordinator` | Connect runtime MCP servers/connectors for a session. |
| MCP protocol schemas | line ~95 schemas | Define method/result shapes. |
| Headless stream loop | `HeadlessControlLoop` | Emits MCP-related status, elicitation, auth, and tool-call state to headless consumers. |

## Plugin hot reload and hook cache

The current `PluginHotReload` path around `cli.renamed.js:334180-334360` can rebuild plugin-contributed hooks after an accepted **policy-settings** change. It is narrower than a universal plugin hot reload: ordinary user/project/local changes do not pass this subscriber's source check, and non-hook contribution families have their own `/reload-plugins` boundary. The install lifecycle separately handles plugin discovery, installation, and pruning.

### Plugin-affecting settings snapshot

`getPluginAffectingSettingsSnapshot()` builds a JSON-stable snapshot of effective `enabledPlugins`/`extraKnownMarketplaces` plus policy `strictKnownMarketplaces`, `blockedMarketplaces`, and `disableSideloadFlags`. The comparison is performed when the settings change detector emits `policySettings`; a policy event that leaves this snapshot unchanged skips the reload.

### Hot-reload runtime (`setupPluginHookHotReload`, `loadPluginHooks`)

`setupPluginHookHotReload()`:

1. Captures `getPluginAffectingSettingsSnapshot()` and subscribes to the general settings change detector.
2. Ignores every emitted source except `policySettings`, then compares the new snapshot.
3. On a changed snapshot, clears the full plugin cache and the memoized plugin-hook loader, then calls `loadPluginHooks()` to rebuild registered hooks from the current cache-only plugin view.
4. Caches the materialized hook records so the [hook dispatcher](hooks-and-events-reference.md#runtime-dispatcher-internals) does not re-parse plugin manifests on every dispatch.

`clearPluginHookCache()` invalidates the memoized hook assembly. `resetHotReloadState()` clears the subscription/snapshot guard so tests or a fresh runtime can initialize it again.

`pruneRemovedPluginHooks()` is a separate targeted helper: it loads the enabled cache-only plugin paths and keeps only registered plugin hooks whose `pluginRoot` still belongs to that set. The policy watcher shown above does not call this helper; it takes the full cache-clear/reload route instead.

### Install lifecycle (`checkEnabledPlugins`, `getInstalledPlugins`, `findMissingPlugins`, `installSelectedPlugins`)

- `checkEnabledPlugins()` compares the `enabledPlugins` setting (per source) against the on-disk plugin cache. Returns a structured result listing missing installs and version mismatches.
- `getInstalledPlugins()` enumerates plugins materialized in the cache (`~/.claude/plugins/cache/...`).
- `findMissingPlugins(enabled)` returns the subset of `enabledPlugins` whose cache entries are missing or out of date.
- `installSelectedPlugins(selection, options, source = "user")` materializes the selection: stages downloads in a temp cache (via `generateTemporaryCacheNameForPlugin` / `cachePlugin`), validates the manifest (`loadPluginManifest`), then promotes to the live cache. The `source` argument controls which settings tier records the install.
- `getPluginEditableScopes()` / `isPersistableScope(scope)` / `settingSourceToScope(source)` decide where install records may be written (e.g. managed-policy installs are not editable from the user shell).

### Background install (`kickOffBackgroundPluginInstall`)

`kickOffBackgroundPluginInstall(missing)` schedules `installSelectedPlugins(missing, {...})` to run in the background after the current turn settles. It is the path used during session startup when `enabledPlugins` references a plugin that is not yet installed: the runtime announces the install in the UI but does not block the session on the download. Failures surface as task notifications.

## Interactive reload and skill health commands

Settings hot reload keeps plugin hooks synchronized, but it does not make every plugin or skill contribution instantly materialize in every already-running subsystem. Three explicit commands own that boundary.

### `/reload-plugins [--force]`

Before mutating runtime state, the local command computes which plugin MCP server names would be added or removed. If those names change after the conversation has produced output, Tool Search is not protecting the prompt cache, and `--force` was not supplied, the command stops and explains that the next message would need to re-read the whole conversation. This is a cache-cost guard, not an assertion that the new plugin config is invalid.

On apply, `Dze()`:

1. clears plugin, skill, and related command caches;
2. reloads enabled/disabled plugins plus errors/warnings;
3. recomputes plugin commands and all agent definitions;
4. materializes plugin MCP and LSP server descriptors;
5. increments the plugin-MCP reconnect key in app state;
6. reloads plugin hooks and emits the global plugin-change signal; and
7. reports enabled plugins, commands/skills, agents, hooks, MCP servers, LSP servers, and errors.

If the first reload finds missing plugin dependencies, `Lze()` may install only dependencies whose marketplace exists, passes enterprise source policy, and is same-marketplace or explicitly allowed as a cross-marketplace dependency. It chooses a persistable scope inherited from an enabled dependent when possible, then runs one second full reload so the newly installed closure becomes active. The command does not silently bypass blocked/unknown marketplace dependencies.

Remote Control does not run this local cache sequence directly. It sends a `reload_plugins` control request and renders the remote process's resulting plugin/command/agent/MCP counts.

### `/reload-skills`

This command snapshots the current `getSkillToolCommands()` names, clears command memoization and the sent-skill-name cache, re-enumerates the same project root, emits the skill-change signal, and reports total/added/removed counts. It compares names rather than file hashes, so an in-place body edit can correctly produce `no changes` in the name summary even though the reloaded content is new. In safe mode the result reminds the user that custom skills remain disabled.

The reload includes filesystem skill discovery and command collision/scoping again; it does not reload plugin binaries, hooks, MCP/LSP descriptors, or agent definitions. Those belong to `/reload-plugins`.

### `/skill-doctor`

`/skill-doctor` is an inspection command, not the broader repair-capable `/doctor` workflow. It considers loaded `prompt` commands but excludes bundled, built-in, managed-policy, and plugin sources from the user-skill table. For each remaining user/project/local skill it reads the usage counter plus days since use, sorts oldest/never-used first, and warns when a loaded skill has never been invoked because every listing entry consumes system-prompt budget.

A second section can report stale **user-installed plugins** only when the runtime already has a cache-only plugin view. A plugin qualifies after at least 14 days and 10 session startups without use. Theme, output-style, monitor, and workflow plugins are excluded from this heuristic because they can provide passive value without command invocation. Seed-managed, non-user-installed, and currently active records are excluded as well.

The command does not disable anything. It points the user to `/skills`, `.claude/skills`, or `/plugin`; durable changes still cross the normal settings/plugin permission paths.

## Related docs

- [Browser automation and Claude in Chrome](browser-automation-and-claude-in-chrome.md)
- [IDE integration and LSP diagnostics](ide-integration-and-lsp-diagnostics.md)
- [Plugin lifecycle and configuration](plugin-lifecycle-and-configuration.md)
- [Tool inventory and schemas](tool-inventory-and-schemas.md)
- [Hooks and events reference](hooks-and-events-reference.md)
- [Tool runtime and security architecture](architecture.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [Computer-use MCP](computer-use-mcp.md)
- [Skills system](skills-system.md)
- [Settings, policy, and integrations](settings-policy-and-integrations.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md)
