# Bundle module map from `cli.renamed.js`

This page records the Bun module partitioning and feature-theme clustering of the semantically renamed bundle `claude-code-pkg/src/entrypoints/cli.renamed.js`. It is a research-grade index: every line range below is a concrete anchor a reader can open in the file. Themes here back the higher-level narrative pages under [`docs/00-start-here/`](../00-start-here/README.md) through [`docs/06-agents-automation/`](../06-agents-automation/README.md); the entry point for product-level reading is the [main feature map](../00-start-here/main-feature-map.md).

## How to read this page

`cli.renamed.js` is the formatted-and-renamed output produced by [`scripts/normalize-cli-js.mjs`](../../scripts/normalize-cli-js.mjs) and [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs). The `2.1.215` renamed file wraps everything in one top-level function expression containing 32,157 statements. Bun emits each original ESM module through a minified lazy-loader helper (named `b` in this build), preceded by forward `function` / `class` / `var` declarations and an export helper (named `nt` here) whose second argument maps semantic export names to identifier-returning getters.

The script [`scripts/extract-cli-module-map.mjs`](../../scripts/extract-cli-module-map.mjs) walks every loader boundary, attaches the surrounding declarations and export tables to that loader, then classifies each module by keyword matching on the semantic names. Outputs:

- [`data/cli-modules.json`](data/cli-modules.json) — every module partition with loader line, declared names, export table, and counts.
- [`data/cli-module-themes.json`](data/cli-module-themes.json) — same data grouped by runtime theme.

Refresh with:

```sh
node scripts/extract-cli-module-map.mjs
```

## Source-anchor policy

| Semantic alias | Minified anchor | Scope |
|---|---|---|
| Bun module loader | Structurally detected outer-arrow → inner-arrow lazy initializer (for example `var loaderName = b(() => { ... })`) | Each loader call marks one original ESM module; statements above it (up to the previous loader) form its forward declarations. |
| Module export table | Any helper call whose second argument is a non-empty object of identifier-returning getters | Maps original ESM export names onto internal implementations without depending on a minified helper name. |
| Theme classification | Regex match on the set of semantic names per module | Order-sensitive priority list in [`scripts/extract-cli-module-map.mjs`](../../scripts/extract-cli-module-map.mjs). |
| Line numbers | 1-based lines in `claude-code-pkg/src/entrypoints/cli.renamed.js` | Loader line = location of the `var loaderName = T(...)` statement. Function definitions usually sit a few hundred lines earlier in the same partition. |

## Coverage summary

| Metric | Value |
|---|---:|
| Top-level statements in wrapping IIFE | 32,157 |
| Bun module loaders | 4,820 |
| Modules with an explicit structural export table | 564 |
| Modules with any semantic declaration or export | 1,208 |
| Modules currently classified into a theme | 228 |
| Modules with semantic info but no theme yet | 980 |
| Fully opaque modules (still all minified) | 3,612 |
| Populated themes recognized | 36 |

Opaque modules are mostly small vendor helpers or inlined arrow chains whose surface stayed minified after the semantic rename pass. They are tracked but not promoted into the narrative docs.

## Claude Code product themes

Each row links a Claude Code subsystem to its loader line range in `cli.renamed.js` and the docs page that already explains the runtime behavior. Open the file at the listed line, then scroll up to find the corresponding `function` / `class` declarations that the loader assembles.

### Session, transcript, agent metadata, and teammate IPC

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `SessionRuntimeStateHub` | 2 | 4202, 133347 | `switchSession`, `setUserMsgOptIn`, `waitForScrollIdle`, `swapMcpServerTools`, `snapshotOutputTokensForTurn` | [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md) |
| `TranscriptAgentMetadataStore` | 1 | 584035 | `writeRemoteAgentMetadata`, `writeAgentMetadata`, `readAgentMetadata`, `getMaterializedSessionFile`, `getTranscriptPathForSession`, `trackSessionWrite` | [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md) |
| `TeammateMailboxIpc` | 1 | 342045 | `writeToMailbox`, `readUnreadMessages`, `readMailbox`, `formatTeammateMessages`, `getInboxPath` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| `TeamFileMemberModes` | 1 | 340851 | `writeTeamFileAsync`, `updateTeamFile`, `syncTeammateMode`, `setMemberMode`, `setMemberActive` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| `SdkQueryAndSessionApi` | 7 | 58004 – 612322 | `query`, `startup`, `resolveSettings`, `tool`, `createSdkMcpServer`, `InMemorySessionStore`, `HOOK_EVENTS`, session/subagent APIs | [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md) |

### Permission, trust, hooks, and policy

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `PermissionRuleEngine` | 1 | 448537 | `toolAlwaysAllowedRule`, `syncPermissionRulesFromDisk`, `permissionRuleSourceDisplayString`, `hasPermissionsToUseTool`, `guardHookUpdatedInput`, `getDenyRules` | [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md) |
| `PermissionModeTransitions` | 1 | 586810 | `verifyAutoModeGateAccess`, `transitionPlanAutoMode`, `transitionPermissionMode`, `stripDangerousPermissionsForAutoMode`, `shouldPlanUseAutoMode`, `shouldDisableBypassPermissions` | [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md) |
| `HookEventDispatcher` | 2 | 260357, 578190 | `shouldSkipHookDueToTrust`, `hasWorktreeCreateHook`, `hasInstructionsLoadedHook`, `hasHookForEvent`, `persistHookOutput`, `parseElicitationHookOutput` | [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md), [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `TrustedPathGlobalConfig` | 1 | 595169 | `isPathTrusted`, `setPathTrusted`, `checkHasTrustDialogAccepted`, `saveGlobalConfig`, `shouldSkipPluginAutoupdate` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |
| `SettingsFileLoader` | 2 | 72934, 74111 | `updateSettingsForSource`, `settingsMergeCustomizer`, `parseSettingsFile`, `parseRemoteManagedSettings`, `loadManagedFileSettingsFromDir` | [Settings schema reference](../03-tools-integrations-security/settings-schema-reference.md) |

### Git, worktree, and daemon

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `GitRepoOperations` | 1 | 65739 | `stashToCleanState`, `redactGitRemoteCredentials`, `preserveGitStateForIssue`, `normalizeGitRemoteUrl`, `isLinkedWorktree`, `isAtGitRoot` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |
| `GitRefWatcher` | 1 | 64612 | `resolveRef`, `resolveGitDir`, `resetGitFileWatcher`, `removeWatchedRepo`, `readWorktreeHeadSha`, `readGitHead` | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |
| `AgentWorktreeManager` | 1 | 262923 | `worktreeBranchName`, `validateWorktreeSlug`, `restoreWorktreeSession`, `persistWorktreeSession`, `removeAgentWorktree`, `listRegisteredWorktrees` | [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) |
| `WorktreeDaemonJobScheduler` | 1 | 909259 | `summarizeEvent`, `stateBucket`, `sortJobs`, `seedLastJobs`, `rollupJobColor`, `deriveActivity`, `deriveBand` | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |

### Models, prompts, and memory

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `ModelSelectionConfig` | 1 | 131978 | `vetUserSpecifiedModel`, `toProviderWireModelId`, `strip1mTag`, `stepDownRestrictedFamilyAliasPick`, `parseUserSpecifiedModel` | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md) |

### Integrations (MCP, plugins, MCPB, LSP)

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `McpChromeBridge` | 4 | 40188 – 52085 | `localPlatformLabel`, `createClaudeForChromeMcpServer`, `createChromeSocketClient`, `createBridgeClient`, `clearBrowserResolution` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md), [Tool runtime, events, and integration flows](../03-tools-integrations-security/tool-runtime-events-and-integrations.md) |
| `McpbExtensionPackaging` | 5 | 207944 – 227138 | `verifyMcpbFile`, `verifyCertificateChain`, `validateManifest`, `unsignMcpbFile`, `unpackExtension`, `signMcpbFile` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `PluginLoader` | 1 | 473632 | `resolvePluginRoot`, `resolveContainedPluginPath`, `mergePluginSources`, `loadSkillsAsPlugins`, `loadPluginManifest`, `loadAllPlugins` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `PluginCommandHandlers` | 1 | 657701 | `pluginValidateHandler`, `pluginUpdateHandler`, `pluginUninstallHandler`, `pluginTagHandler`, `pluginPruneHandler`, `pluginListHandler`, `pluginInstallHandler`, `pluginInitHandler` | [Commands and flags](../01-runtime-lifecycle/commands-and-flags.md) |
| `LspIdeClient` | 1 | 320957 | `createLSPClient` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |

### Auth (multi-cloud)

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `GatewayAuthRefresh` | 2 | 127575, 187446 | `withOAuthRefreshLock`, `validateForceLoginOrg`, `shouldUseWIFAuth`, `refreshGcpAuth`, `getAnthropicApiKey`, `getAuthTokenSource` | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `LoginFlow` | 1 | 779039 | `Login`, `runPostLoginHooks`, `call` | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |

### Remote control, feature flags, networking

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `RemoteControlFeatureGates` | 1 | 593815 | `isRunningInRemoteEnvironment`, `isRemoteControlInternalEventsEnabled`, `isRemoteControlHardDisabled`, `isPreviewHmrEnabled`, `isPersistentRemoteSessionEnabled` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md), [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md) |
| `GrowthBookFeatureFlags` | 1 | 188311 | `refreshGrowthBookFeatures`, `refreshGrowthBookAfterAuthChange`, `setupPeriodicGrowthBookRefresh`, `stopPeriodicGrowthBookRefresh`, `resetGrowthBook` | [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md) |
| `ProxyClientFactory` | 1 | 101618 | `shouldBypassProxy`, `prefetchProxyAuthFromHelperIfSafe`, `getWebSocketProxyUrl`, `getProxyUrl`, `getProxyFetchOptions`, `getProxyAgent` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |

### TUI and rendering

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `TerminalTextFormatting` | 3 | 192088 – 313926 | `wrapText`, `truncateToWidth`, `truncateToWidthNoEllipsis`, `truncateStartToWidth`, `truncatePathMiddle`, `formatTokens` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |
| `InkTerminalHooks` | 8 | 290209 – 313857 | `useTheme`, `useTerminalViewport`, `useTerminalFocus`, `useTerminalTitle`, `useStdin`, `useResolvedTheme`, `ThemeProvider` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |

### Observability and ops

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `AnalyticsEventSink` | 1 | 4289 | `logEvent`, `logEventAsync`, `createAnalyticsState`, `attachAnalyticsSink`, `stripProtoFields` | [Telemetry and tracing](../05-hosted-agent-ops/telemetry-and-tracing.md) |
| `StartupPerformanceProfiler` | 1 | 38458 | `profileReport`, `profileCheckpoint`, `logStartupPerf`, `isDetailedProfilingEnabled`, `getStartupPerfLogPath` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md) |
| `ProcessIoErrorHandlers` | 2 | 23465 – 23673 | `writeToStdout`, `writeToStderr`, `registerProcessOutputErrorHandlers`, `setBgExitCause`, `readAndClearBgExitCause` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md) |

## Third-party dependencies (bundled, not Claude Code logic)

These themes correspond to vendored runtime libraries embedded in `cli.renamed.js`. They are recorded here so reverse-engineers can skip them quickly and not mistake them for product code.

| Vendor | Modules | Loader line range | Anchor symbols |
|---|---:|---|---|
| AWS SDK / Bedrock / Smithy | 145 | 98069 – 139587 | `*Command` classes, `httpAuthSchemeMiddleware`, `resolveDefaultRuntimeConfig`, `AutomatedReasoning*`, `BedrockRuntime*` |
| MSAL / Microsoft identity and related auth surface | 10 | 16918 – 165864 | identity/auth exports and credential helpers matched by the generated theme pattern |
| Zod schema validation | 12 | 5720 – 28096 | `Zod*`, `parseAsync`, `safeParse`, `toJSONSchema`, `treeifyError` |
| Ink React hooks (terminal UI runtime) | 8 | 290209 – 313857 | See `InkTerminalHooks` above; Ink itself is bundled with the Claude Code TUI hooks |
| Axios HTTP | 2 | 29562 – 31340 | `hasStandardBrowserWebWorkerEnv`, `hasStandardBrowserEnv`, `hasBrowserEnv`, `isBuffer` |
| fflate zip/zlib codec | 1 | 206949 | `zlibSync`, `unzlibSync`, `zipSync`, `unzipSync`, `deflate`, `inflate` |
| i18n locales table | 1 | 12492 | `zhTW`, `zhCN`, `vi`, `ur`, `tr`, plus the bundled locale codes |

## Verification probe

Run this one-liner to confirm representative function declarations from the table above still resolve in the renamed bundle:

```sh
grep -nE "function (switchSession|writeRemoteAgentMetadata|writeToMailbox|toolAlwaysAllowedRule|transitionPermissionMode|pluginInstallHandler|verifyMcpbFile|createBridgeClient|parseUserSpecifiedModel|worktreeBranchName|refreshGcpAuth|getProxyAgent|refreshGrowthBookFeatures|isRunningInRemoteEnvironment|setMemberMode|getInboxPath|persistHookOutput|profileReport|logEvent|truncateToWidth|useTheme)\b" claude-code-pkg/src/entrypoints/cli.renamed.js
```

For the `2.1.215` build under `claude-code-pkg/`, these representative semantic anchors resolve. Replacement bundles regenerated by [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs) can move or lose individual aliases as export/minifier surfaces change.

## Caveats

- Loader and export helper names are minified and changed from `T`/`j$` to `b`/`nt` in this update. The extractor detects both structures rather than depending on those names. Statements between two loaders are attributed to the second loader (the module being initialized).
- Themes are identified by keyword regexes on the per-module set of semantic names. They have priority order; the first match wins. Some modules contain symbols from multiple themes (e.g. session hub + memory). Reclassify by adjusting the patterns in [`scripts/extract-cli-module-map.mjs`](../../scripts/extract-cli-module-map.mjs).
- 980 modules with semantic content remain unclassified because they hold subsystem-specific names not yet promoted to a theme. They are recorded verbatim in [`data/cli-modules.json`](data/cli-modules.json) and are good seeds for further atlas passes.
- 3,612 modules are still fully opaque (no semantic names yet) and are intentionally not surfaced here. Further rename evidence can lift more of them; see the rename pipeline in [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs) for the existing evidence classes.

## Navigation

- [Research atlas index](README.md)
- [Main feature map for Claude Code](../00-start-here/main-feature-map.md)
- [System architecture](../00-start-here/system-architecture.md)
- [Full table of contents](../SUMMARY.md)
