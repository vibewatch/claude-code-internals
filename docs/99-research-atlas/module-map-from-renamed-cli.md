# Bundle module map from `cli.renamed.js`

This page records the Bun module partitioning and feature-theme clustering of the semantically renamed bundle `claude-code-pkg/src/entrypoints/cli.renamed.js`. It is a research-grade index: every line range below is a concrete anchor a reader can open in the file. Themes here back the higher-level narrative pages under [`docs/00-start-here/`](../00-start-here/README.md) through [`docs/06-agents-automation/`](../06-agents-automation/README.md); the entry point for product-level reading is the [main feature map](../00-start-here/main-feature-map.md).

## How to read this page

`cli.renamed.js` is the formatted-and-renamed output produced by [`scripts/normalize-cli-js.mjs`](../../scripts/normalize-cli-js.mjs) and [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs). The renamed file wraps everything in one top-level function expression that contains 23,365 statements. Bun emits each original ESM module as a `var loaderName = T(() => { /* setup */ });` loader, preceded by the module’s forward `function` / `class` / `var` declarations and `j$(module, { semanticName: () => obfuscatedName, ... })` export tables.

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
| Bun module loader | `var loaderName = T(() => { ... })` in `cli.renamed.js` | Each loader call marks one original ESM module; statements above it (up to the previous loader) form its forward declarations. |
| Module export table | `j$(module, { semanticName: () => obfuscatedBinding, ... })` | Maps the original ESM export name (now also the binding identifier after rename) onto its internal implementation. |
| Theme classification | Regex match on the set of semantic names per module | Order-sensitive priority list in [`scripts/extract-cli-module-map.mjs`](../../scripts/extract-cli-module-map.mjs). |
| Line numbers | 1-based lines in `claude-code-pkg/src/entrypoints/cli.renamed.js` | Loader line = location of the `var loaderName = T(...)` statement. Function definitions usually sit a few hundred lines earlier in the same partition. |

## Coverage summary

| Metric | Value |
|---|---:|
| Top-level statements in wrapping IIFE | 23,365 |
| Bun module loaders (`T(() => { ... })`) | 3,814 |
| Modules with explicit `j$` export table | 387 |
| Modules with any semantic decl or export | 918 |
| Modules currently classified into a theme | 232 |
| Modules with semantic info but no theme yet | 686 |
| Fully opaque modules (still all minified) | 2,896 |
| Themes recognized | 37 |

Opaque modules are mostly small vendor helpers or inlined arrow chains whose surface stayed minified after the semantic rename pass. They are tracked but not promoted into the narrative docs.

## Claude Code product themes

Each row links a Claude Code subsystem to its loader line range in `cli.renamed.js` and the docs page that already explains the runtime behavior. Open the file at the listed line, then scroll up to find the corresponding `function` / `class` declarations that the loader assembles.

### Session, transcript, agent metadata, and teammate IPC

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `SessionRuntimeStateHub` | 2 | 3398, 118553 | `switchSession`, `setUserMsgOptIn`, `waitForScrollIdle`, `setSessionOverridesGetter`, `regenerateSessionId`, `getParentSessionId`, `setTracerProvider`, `setTeleportedSessionInfo`, `snapshotOutputTokensForTurn`, `setThinkingTypeOverride`, `setTerminalFocusForState`, `setTeamMemoryServerStatus`, `setSystemPromptSectionCacheEntry` | [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md) |
| `TranscriptAgentMetadataStore` | 1 | 623491 | `writeRemoteAgentMetadata`, `writeAgentMetadata`, `readAgentMetadata`, `getMaterializedSessionFile`, `getTranscriptPathForSession`, `transcriptCursorEnd`, `trackSessionWrite`, `subscribeSessionTitleChanged`, `subscribeSessionAgentNameChanged`, `setInternalEventWriter`, `setInternalEventReader`, `worktreeStateSignal`, `sessionIdExists` | [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md) |
| `TeammateMailboxIpc` | 1 | 286598 | `writeToMailbox`, `sendShutdownRequestToMailbox`, `readUnreadMessages`, `readMailbox`, `markMessagesAsRead`, `markMessageAsReadByIndex`, `markMessagesAsReadByPredicate`, `formatTeammateMessages`, `createIdleNotification`, `isIdleNotification`, `isTeamPermissionUpdate`, `isTaskAssignment`, `isStructuredProtocolMessage`, `isShutdownRequest`, `isShutdownRejected`, `getInboxPath` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| `TeamFileMemberModes` | 1 | 476236 | `writeTeamFileAsync`, `updateTeamFile`, `unregisterTeamForSessionCleanup`, `syncTeammateMode`, `setMultipleMemberModes`, `setMemberMode`, `setMemberActive`, `sanitizeName` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| `SdkQueryAndSessionApi` | 7 | 57255, 57368, 57451, 603841, 603910, 604195, 605109 | `query`, `startup`, `resolveSettings`, `tool`, `createSdkMcpServer`, `parseDirectConnectUrl`, `DirectConnectTransport`, `DirectConnectError`, `InMemorySessionStore`, `HOOK_EVENTS`, `EXIT_REASONS`, `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, `filterEscalatingDefaultMode`, `foldSessionSummary`, `importSessionToStore`, `forkSession`, `deleteSession`, `tagSession`, `renameSession`, `getSessionMessages`, `getSessionInfo`, `listSessions`, `getSubagentMessages`, `listSubagents`, `AbortError` | [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md) |

### Permission, trust, hooks, and policy

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `PermissionRuleEngine` | 1 | 507251 | `toolAlwaysAllowedRule`, `syncPermissionRulesFromDisk`, `permissionRuleSourceDisplayString`, `hasPermissionsToUseTool`, `guardHookUpdatedInput`, `getRuleByContentsForToolName`, `getRuleByContentsForTool`, `getDenyRules`, `getDenyRuleForTool`, `getDenyRuleForAgent`, `getAskRules`, `getAskRuleForTool` | [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md) |
| `PermissionModeTransitions` | 1 | 508105 | `verifyAutoModeGateAccess`, `transitionPlanAutoMode`, `transitionPermissionMode`, `stripDangerousPermissionsForAutoMode`, `shouldPlanUseAutoMode`, `shouldDisableBypassPermissions`, `setPermissionModeWithGuards`, `restoreDangerousPermissions`, `removeDangerousPermissions`, `prepareContextForPlanMode`, `parseToolListFromCLI`, `parseBaseToolsFromCLI` | [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md) |
| `HookEventDispatcher` | 1 | 629735 | `shouldSkipHookDueToTrust`, `hasWorktreeCreateHook`, `hasInstructionsLoadedHook`, `hasHookForEvent`, `hasBlockingResult`, `getUserPromptSubmitHookBlockingMessage`, `getTeammateIdleHookMessage`, `getTaskCreatedHookMessage`, `getTaskCompletedHookMessage`, `getTelemetryHookName`, `persistHookOutput`, `parseElicitationHookOutput` | [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md), [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `TrustedPathGlobalConfig` | 1 | 169401 | `isPathTrusted`, `setPathTrusted`, `checkHasTrustDialogAccepted`, `resetTrustDialogAcceptedCache`, `isGlobalConfigKey`, `saveGlobalConfig`, `saveCurrentProjectConfig`, `isProjectConfigKey`, `getRemoteControlAtStartup`, `getDaemonColdStart`, `isAutoUpdaterDisabled`, `shouldSkipPluginAutoupdate`, `recordFirstStartTime` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |
| `SettingsFileLoader` | 2 | 62036, 62450 | `updateSettingsForSource`, `shouldIncludeParentTier`, `settingsMergeCustomizer`, `rawSettingsContainsKey`, `parseSettingsFileUncached`, `parseSettingsFile`, `parseRemoteManagedSettings`, `loadManagedFileSettingsFromDir` | [Settings schema reference](../03-tools-integrations-security/settings-schema-reference.md) |
| `SecretRedaction` | 1 | 11510 | `redact`, `redactObject`, `redactSensitiveKeys`, `redactedJsonPreview`, `stripUrlSecrets`, `scan` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md) |

### Git, worktree, and daemon

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `GitRepoOperations` | 1 | 55226 | `stashToCleanState`, `redactGitRemoteCredentials`, `preserveGitStateForIssue`, `normalizeGitRemoteUrl`, `isLinkedWorktree`, `isCurrentDirectoryBareGitRepo`, `isBranchOnOrigin`, `isAtGitRoot` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |
| `GitRefWatcher` | 1 | 54518 | `resolveRef`, `resolveGitDir`, `resetGitFileWatcher`, `removeWatchedRepo`, `readWorktreeHeadSha`, `readRawSymref`, `readGitHead`, `onRepoBranchChange` | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |
| `AgentWorktreeManager` | 1 | 631021 | `worktreeBranchName`, `validateWorktreeSlug`, `restoreWorktreeSession`, `persistWorktreeSession`, `removeAgentWorktree`, `listRegisteredWorktrees`, `parsePRReference`, `killTmuxSession` | [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) |
| `WorktreeDaemonJobScheduler` | 1 | 686644 | `summarizeEvent`, `stateBucket`, `spawnOrigin`, `sortJobs`, `seedLastJobs`, `repoGroup`, `repoGroupLabel`, `rollupChildColor`, `rollupJobColor`, `pruneMap`, `formatJobAge`, `jobLabel`, `deriveActivity`, `deriveBand`, `needsRespawn`, `labelReplaceFrame` | [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) |

### Models, prompts, and memory

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `ModelSelectionConfig` | 1 | 118207 | `resolveSkillModelOverride`, `renderModelSetting`, `renderModelName`, `renderDefaultModelSetting`, `parseUserSpecifiedModel`, `normalizeModelStringForAPI`, `modelDisplayString`, `isOpus1mMergeEnabled`, `isNonCustomOpusModel`, `isLegacyOpusFirstParty`, `isLegacyModelRemapEnabled`, `getUserSpecifiedModelSetting` | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md) |
| `MemoryFileRules` | 1 | 259680 | `processMemoryFile`, `processMdRules`, `processConditionedMdRules`, `isMemoryFilePath`, `isSyntheticMemoryPath`, `resetGetMemoryFilesCache`, `shouldShowClaudeMdExternalIncludesWarning`, `stripHtmlComments` | [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md) |

### Integrations (MCP, plugins, MCPB, LSP)

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `McpChromeBridge` | 4 | 13823, 13838, 39107, 39134 | `localPlatformLabel`, `createClaudeForChromeMcpServer`, `createChromeSocketClient`, `createBridgeClient`, `clearBrowserResolution`, `BridgeClient`, `BROWSER_TOOLS`, `ToolCallTimeoutError`, `SocketConnectionError`, `NoExtensionConnectedError`, `ExtensionDisconnectedMidCallError`, `PEER_WAIT_TIMEOUT_MS`, `DISCOVERY_TIMEOUT_MS`, `WAIT_MAX_DURATION_S` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md), [Tool runtime, events, and integration flows](../03-tools-integrations-security/tool-runtime-events-and-integrations.md) |
| `McpbExtensionPackaging` | 5 | 268617, 271802, 271894, 272295, 272401 | `verifyMcpbFile`, `verifyCertificateChain`, `validateManifest`, `unsignMcpbFile`, `unpackExtension`, `signMcpbFile`, `shouldExclude`, `replaceVariables`, `readPackageJson`, `readMcpbIgnorePatterns`, `promptVisualAssets`, `promptUserConfig` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `PluginLoader` | 1 | 276711 | `resolvePluginPath`, `resolveContainedPluginPath`, `probeSeedCacheAnyVersion`, `mergePluginSources`, `loadSkillsAsPlugins`, `loadPluginManifest`, `loadAllPluginsCacheOnly`, `loadAllPlugins` | [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md) |
| `PluginCommandHandlers` | 1 | 644148 | `pluginValidateHandler`, `pluginUpdateHandler`, `pluginUninstallHandler`, `pluginTagHandler`, `pluginPruneHandler`, `pluginListHandler`, `pluginInstallHandler`, `pluginInitHandler` | [Commands and flags](../01-runtime-lifecycle/commands-and-flags.md) |
| `LspIdeClient` | 1 | 428870 | `createLSPClient` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |

### Auth (multi-cloud)

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `GatewayAuthRefresh` | 2 | 110458, 157847 | `withOAuthRefreshLock`, `validateForceLoginOrg`, `shouldUseWIFAuth`, `saveOAuthTokensIfNeeded`, `saveApiKey`, `restoreGatewayAuth`, `resetAwsAuthRefreshCooldown`, `removeApiKey`, `refreshGcpCredentialsIfNeeded`, `refreshGcpAuth`, `getAnthropicApiKey`, `hasAnthropicApiKeyAuth`, `getAuthTokenSource`, `isAnthropicAuthEnabled` | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| `LoginFlow` | 1 | 409636 | `Login`, `runPostLoginHooks`, `call` | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |

### Remote control, feature flags, networking

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `RemoteControlFeatureGates` | 1 | 325388 | `isRunningInRemoteEnvironment`, `isRemoteControlInternalEventsEnabled`, `isRemoteControlHardDisabled`, `isPreviewHmrEnabled`, `isPersistentRemoteSessionEnabled`, `isCseShimEnabled`, `isCcrV2SendEventsEnabled`, `isCcrMirrorEnabled` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md), [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md) |
| `GrowthBookFeatureFlags` | 1 | 167597 | `refreshGrowthBookFeatures`, `refreshGrowthBookAfterAuthChange`, `setupPeriodicGrowthBookRefresh`, `stopPeriodicGrowthBookRefresh`, `setGrowthBookConfigOverride`, `onGrowthBookRefresh`, `isGrowthBookEnabled`, `resetGrowthBook` | [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md) |
| `ProxyClientFactory` | 1 | 91577 | `shouldBypassProxy`, `prefetchProxyAuthFromHelperIfSafe`, `getWebSocketProxyUrl`, `getProxyUrl`, `getProxyFetchOptions`, `getProxyAuthFromHelperCached`, `getProxyAuthFromHelper`, `getProxyAgent` | [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md) |

### TUI and rendering

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `TerminalTextFormatting` | 3 | 12130, 12130 (helpers), 199851 | `wrapText`, `truncateToWidth`, `truncateToWidthNoEllipsis`, `truncateStartToWidth`, `truncatePathMiddle`, `formatTokens`, `formatTokenEstimate`, `formatSecondsShort`, `formatResetTime` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |
| `InkTerminalHooks` | 8 | 173046 – 199781 | `useTheme`, `useTerminalViewport`, `useTerminalFocus`, `useTerminalTitle`, `useTabStatus`, `useStdin`, `useSelection`, `useResolvedTheme`, `useThemeSetting`, `useTimeout`, `usePreviewTheme`, `useCustomThemes`, `ThemeProvider` | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |

### Observability and ops

| Semantic alias / theme | Modules | Loader line range | Representative exports | Companion doc |
|---|---:|---|---|---|
| `AnalyticsEventSink` | 1 | 3474 | `logEvent`, `logEventAsync`, `createAnalyticsState`, `attachAnalyticsSink`, `stripProtoFields`, `_setGlobalAnalyticsStateForTesting`, `setGlobalAnalyticsStateForTesting` | [Telemetry and tracing](../05-hosted-agent-ops/telemetry-and-tracing.md) |
| `StartupPerformanceProfiler` | 1 | 12438 | `profileReport`, `profileCheckpoint`, `logStartupPerf`, `isDetailedProfilingEnabled`, `getStartupPerfLogPath` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md) |
| `ProcessIoErrorHandlers` | 2 | 11183, 11235 | `writeToStdout`, `writeToStderr`, `registerProcessOutputErrorHandlers`, `peekForStdinData`, `exitWithError`, `setBgExitCause`, `readAndClearBgExitCause` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md) |

## Third-party dependencies (bundled, not Claude Code logic)

These themes correspond to vendored runtime libraries embedded in `cli.renamed.js`. They are recorded here so reverse-engineers can skip them quickly and not mistake them for product code.

| Vendor | Modules | Loader line range | Anchor symbols |
|---|---:|---|---|
| AWS SDK / Bedrock / Smithy | 154 | 70461 – 117003 | `*Command` classes, `httpAuthSchemeMiddleware`, `resolveDefaultRuntimeConfig`, `getDefaultClientConfiguration`, `AutomatedReasoning*`, `BedrockRuntime*` |
| MSAL (Microsoft Identity) | 10 | 4322 – 143196 | `UsernamePasswordClient`, `TokenCache`, `TokenCacheContext`, `BrokerClient`, `ClientAuthErrorCodes`, `instrumentBrokerParams`, `X_CLIENT_VER`, `tokenRefreshRequired` |
| Zod schema validation | 13 | 14503 – 28588 | `ZodSchema`, `ZodString`, `ZodNumber`, `parseAsync`, `safeParse`, `toJSONSchema`, `setErrorMap`, `ZodISODate*`, `datetimeRegex` |
| Ink React hooks (terminal UI runtime) | 8 | 173046 – 199781 | See `InkTerminalHooks` above; Ink itself is bundled with the Claude Code TUI hooks |
| Axios HTTP | 2 | 39541 – 41297 | `hasStandardBrowserWebWorkerEnv`, `hasStandardBrowserEnv`, `hasBrowserEnv`, `isBuffer`, `isArrayBufferView`, `isSpecCompliantForm` |
| fflate zip/zlib codec | 1 | 267623 | `zlibSync`, `unzlibSync`, `zipSync`, `unzipSync`, `deflate`, `inflate`, `gunzipSync`, `strFromU8`, `strToU8` |
| i18n locales table | 1 | 25400 | `zhTW`, `zhCN`, `ja`, `ko`, `en`, `de`, `fr`, `es`, plus 30+ ISO short codes |

## Verification probe

Run this one-liner to confirm representative function declarations from the table above still resolve in the renamed bundle:

```sh
grep -nE "function (switchSession|writeRemoteAgentMetadata|writeToMailbox|toolAlwaysAllowedRule|transitionPermissionMode|pluginInstallHandler|verifyMcpbFile|createBridgeClient|processMemoryFile|parseUserSpecifiedModel|worktreeBranchName|refreshGcpAuth|getProxyAgent|refreshGrowthBookFeatures|isRunningInRemoteEnvironment|setMemberMode|getInboxPath|persistHookOutput|profileReport|logEvent|redactObject|truncateToWidth|useTheme)\b" claude-code-pkg/src/entrypoints/cli.renamed.js
```

For the build under `claude-code-pkg/` checked in here, all 23 anchors resolve. Replacement bundles regenerated by [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs) should reproduce the same names while line numbers may shift.

## Caveats

- Each loader fingerprint is `var X = T(() => { ... })`. Statements between two loaders are attributed to the second loader (the module being initialized). Forward declarations for a module therefore precede its loader, sometimes by several thousand lines (e.g. the Session hub forwards from line 2015 forward but its loader sits at 3398).
- Themes are identified by keyword regexes on the per-module set of semantic names. They have priority order; the first match wins. Some modules contain symbols from multiple themes (e.g. session hub + memory). Reclassify by adjusting the patterns in [`scripts/extract-cli-module-map.mjs`](../../scripts/extract-cli-module-map.mjs).
- 686 modules with semantic content remain unclassified because they hold subsystem-specific names we have not yet promoted to a theme (proxy auth helpers, slash-command tables, etc.). They are recorded verbatim in [`data/cli-modules.json`](data/cli-modules.json) and are good seeds for further atlas passes.
- 2,896 modules are still fully opaque (no semantic names yet) and are intentionally not surfaced here. Further rename evidence (additional call-path patterns, registry inspection) can lift more of them; see the rename pipeline in [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs) for the existing evidence classes.

## Navigation

- [Research atlas index](README.md)
- [Main feature map for Claude Code](../00-start-here/main-feature-map.md)
- [System architecture](../00-start-here/system-architecture.md)
- [Full table of contents](../SUMMARY.md)
