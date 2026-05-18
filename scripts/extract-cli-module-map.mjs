#!/usr/bin/env node

/**
 * Walks claude-code-pkg/src/entrypoints/cli.renamed.js, partitions the
 * top-level statements by Bun loader boundaries (`var X = T(() => { ... })`),
 * collects every semantic function/class/var name plus any `j$` export-table
 * properties belonging to each partition, then bins the partitions into
 * runtime feature themes by keyword matching.
 *
 * Outputs:
 *   docs/99-research-atlas/data/cli-modules.json   raw per-module records
 *   docs/99-research-atlas/data/cli-module-themes.json   theme summaries
 *
 * Reuses the AST/heuristic produced by scripts/semantic-rename-cli.mjs so
 * "minified-looking" detection matches the rename pipeline.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(REPO_ROOT, "claude-code-pkg", "src", "entrypoints", "cli.renamed.js");
const OUT_DIR = join(REPO_ROOT, "docs", "99-research-atlas", "data");
const OUT_MODULES = join(OUT_DIR, "cli-modules.json");
const OUT_THEMES = join(OUT_DIR, "cli-module-themes.json");

const THEMES = [
  // Order matters: more specific patterns first.
  ["AWS SDK / Bedrock / Smithy", /\b([A-Z][A-Za-z]+Command|CognitoIdentity|sigv4|smithy|loadConfigsForDefaultMode|resolveDefaultRuntimeConfig|getDefaultClientConfiguration|httpAuthSchemeMiddleware|AutomatedReasoning|InvokeModel|ListFoundationModels|BedrockRuntime)\b/],
  ["MSAL / Microsoft Identity auth", /\b(UsernamePasswordClient|TokenCache|TokenCacheContext|BrokerClient|ClientAuthErrorCodes|BrowserAuthError|ServerError|ResponseMode|instrumentBrokerParams|X_CLIENT_VER|CLIENT_ID|REDIRECT_URI|GRANT_TYPE|tokenRefreshRequired)\b/],
  ["GCP WIF / Anthropic / gateway auth", /\b(getWIF[A-Za-z]+|isWIFActive|refreshGcpAuth|refreshGcpCredentialsIfNeeded|shouldUseWIFAuth|restoreGatewayAuth|isAnthropicAuthEnabled|getAnthropicApiKey|hasAnthropicApiKeyAuth|getAuthTokenSource|withOAuthRefreshLock|saveOAuthTokensIfNeeded)\b/],
  ["Zod schema validation", /\b(Zod[A-Z][A-Za-z]+|safeParse|parseAsync|toJSONSchema|setErrorMap|ZodError|datetimeRegex|ZodSchema|isoDateTime)\b/],
  ["MCP / Tool bridge / Chrome", /\b(BridgeClient|BROWSER_TOOLS|createClaudeForChromeMcpServer|McpError|McpServer|McpClient|StdioClient|StdioServer)\b/],
  ["MCPB extension packaging / signing", /\b(verifyMcpbFile|signMcpbFile|unsignMcpbFile|unpackExtension|verifyCertificateChain|validateManifest|readMcpbIgnorePatterns)\b/],
  ["Session / runtime state hub", /\b(switchSession|setUserMsgOptIn|waitForScrollIdle|updateLastInteractionTime|setTracerProvider|setTeleportedSessionInfo|snapshotOutputTokensForTurn|setSessionOverridesGetter|regenerateSessionId|getParentSessionId)\b/],
  ["SDK / query / session API surface", /\b(createSdkMcpServer|parseDirectConnectUrl|DirectConnectTransport|DirectConnectError|InMemorySessionStore|HOOK_EVENTS|EXIT_REASONS|SYSTEM_PROMPT_DYNAMIC_BOUNDARY|filterEscalatingDefaultMode|foldSessionSummary|importSessionToStore|listSubagents|getSubagentMessages)\b/],
  ["Transcript / agent metadata / session files", /\b(transcriptCursorEnd|writeRemoteAgentMetadata|writeAgentMetadata|readAgentMetadata|getMaterializedSessionFile|getTranscriptPathForSession|subscribeSessionTitleChanged|trackSessionWrite|isTranscriptMessage)\b/],
  ["Hooks subsystem", /\b(shouldSkipHookDueToTrust|hasWorktreeCreateHook|hasInstructionsLoadedHook|getUserPromptSubmitHookBlockingMessage|getTeammateIdleHookMessage|persistHookOutput|parseElicitationHookOutput|hasHookForEvent)\b/],
  ["Mailbox / teammate IPC", /\b(writeToMailbox|sendShutdownRequestToMailbox|readUnreadMessages|readMailbox|markMessageAsReadByIndex|markMessagesAsRead|formatTeammateMessages|createIdleNotification|isIdleNotification|getInboxPath)\b/],
  ["Trust / config / global settings", /\b(isPathTrusted|setPathTrusted|checkHasTrustDialogAccepted|resetTrustDialogAcceptedCache|isGlobalConfigKey|saveGlobalConfig|getGlobalConfig|getRemoteControlAtStartup|getDaemonColdStart|isProjectConfigKey)\b/],
  ["Permission rules / tool gating", /\b(toolAlwaysAllowedRule|syncPermissionRulesFromDisk|permissionRuleSourceDisplayString|hasPermissionsToUseTool|guardHookUpdatedInput|getRuleByContentsForToolName|getRuleByContentsForTool|getDenyRules)\b/],
  ["Permission mode / auto mode", /\b(verifyAutoModeGateAccess|transitionPlanAutoMode|transitionPermissionMode|stripDangerousPermissionsForAutoMode|shouldPlanUseAutoMode|shouldDisableBypassPermissions|setPermissionModeWithGuards|restoreDangerousPermissions)\b/],
  ["Model selection / configuration", /\b(resolveSkillModelOverride|renderModelSetting|renderModelName|renderDefaultModelSetting|parseUserSpecifiedModel|normalizeModelStringForAPI|modelDisplayString|isOpus1mMergeEnabled)\b/],
  ["Settings file load / merge", /\b(updateSettingsForSource|shouldIncludeParentTier|settingsMergeCustomizer|rawSettingsContainsKey|parseSettingsFileUncached|parseSettingsFile|parseRemoteManagedSettings|loadManagedFileSettingsFromDir)\b/],
  ["Git operations / issue context", /\b(stashToCleanState|redactGitRemoteCredentials|preserveGitStateForIssue|normalizeGitRemoteUrl|isLinkedWorktree|isCurrentDirectoryBareGitRepo|isBranchOnOrigin|isAtGitRoot)\b/],
  ["Git ref / file watcher", /\b(resolveRef|resolveGitDir|resetGitFileWatcher|removeWatchedRepo|readWorktreeHeadSha|readRawSymref|readGitHead|onRepoBranchChange)\b/],
  ["Agent worktree management", /\b(worktreeBranchName|validateWorktreeSlug|restoreWorktreeSession|persistWorktreeSession|removeAgentWorktree|listRegisteredWorktrees|parsePRReference|killTmuxSession)\b/],
  ["Plugin loader / skill import", /\b(loadAllPlugins|loadAllPluginsCacheOnly|loadPluginManifest|loadSkillsAsPlugins|resolvePluginPath|resolveContainedPluginPath|mergePluginSources|probeSeedCacheAnyVersion)\b/],
  ["Plugin command handlers", /\b(pluginValidateHandler|pluginUpdateHandler|pluginUninstallHandler|pluginTagHandler|pluginPruneHandler|pluginListHandler|pluginInstallHandler|pluginInitHandler)\b/],
  ["Memory files / Markdown rules", /\b(processMemoryFile|processMdRules|processConditionedMdRules|isMemoryFilePath|isSyntheticMemoryPath|resetGetMemoryFilesCache|shouldShowClaudeMdExternalIncludesWarning|stripHtmlComments)\b/],
  ["Proxy / HTTP / WebSocket", /\b(shouldBypassProxy|prefetchProxyAuthFromHelperIfSafe|getWebSocketProxyUrl|getProxyUrl|getProxyFetchOptions|getProxyAuthFromHelperCached|getProxyAuthFromHelper|getProxyAgent)\b/],
  ["Remote control / feature gates", /\b(isRunningInRemoteEnvironment|isRemoteControlInternalEventsEnabled|isRemoteControlHardDisabled|isPreviewHmrEnabled|isPersistentRemoteSessionEnabled|isCseShimEnabled|isCcrV2SendEventsEnabled|isCcrMirrorEnabled)\b/],
  ["Team file / member modes", /\b(writeTeamFileAsync|updateTeamFile|unregisterTeamForSessionCleanup|syncTeammateMode|setMultipleMemberModes|setMemberMode|setMemberActive)\b/],
  ["GrowthBook feature flags", /\b(refreshGrowthBookFeatures|refreshGrowthBookAfterAuthChange|setupPeriodicGrowthBookRefresh|stopPeriodicGrowthBookRefresh|setGrowthBookConfigOverride|onGrowthBookRefresh|isGrowthBookEnabled|resetGrowthBook)\b/],
  ["TUI text / token formatting", /\b(truncateToWidth|truncateToWidthNoEllipsis|truncateStartToWidth|truncatePathMiddle|formatTokens|formatTokenEstimate|formatSecondsShort|formatResetTime|wrapText)\b/],
  ["Ink React hooks (terminal UI)", /\b(useTheme|useTerminalViewport|useTerminalFocus|useTerminalTitle|useTabStatus|useStdin|useSelection|useResolvedTheme|useThemeSetting|useTimeout|usePreviewTheme)\b/],
  ["Startup performance profiling", /\b(profileReport|profileCheckpoint|logStartupPerf|isDetailedProfilingEnabled|getStartupPerfLogPath)\b/],
  ["Login flow / post-login hooks", /\b(runPostLoginHooks|^Login$)\b/],
  ["Process I/O / stdout-stderr", /\b(writeToStdout|writeToStderr|registerProcessOutputErrorHandlers|peekForStdinData|exitWithError|setBgExitCause|readAndClearBgExitCause)\b/],
  ["Analytics / telemetry events", /\b(logEvent|logEventAsync|createAnalyticsState|attachAnalyticsSink|_setGlobalAnalyticsStateForTesting|stripProtoFields)\b/],
  ["Secret redaction / sanitization", /\b(redactObject|redactSensitiveKeys|redactedJsonPreview|stripUrlSecrets|^redact$)\b/],
  ["Job / activity scheduler (worktree daemon)", /\b(pruneMap|formatJobAge|jobLabel|deriveActivity|deriveBand|doneCapForRows|stateBucket|needsRespawn|labelReplaceFrame|repoGroupLabel|rollupJobColor)\b/],
  ["i18n locales", /\b(zhTW|zhCN|^ja$|^ko$|^en$|^de$|^fr$|^es$|^it$|^ru$|^pt$|^pl$|^nl$|^tr$|^ar$|^vi$|^th$|^uk$|^cs$|^hu$)\b/],
  ["Axios HTTP", /\b(hasStandardBrowserWebWorkerEnv|hasStandardBrowserEnv|hasBrowserEnv|isBuffer|isArrayBufferView|isSpecCompliantForm|kindOfTest)\b/],
  ["LSP / IDE client", /\b(createLSPClient|LspClient)\b/],
  ["fflate zip/zlib codec", /\b(zlibSync|unzlibSync|zipSync|unzipSync|^deflate$|^inflate$|deflateSync|inflateSync|gunzipSync|strFromU8|strToU8)\b/],
];

function isMinified(name) {
  return name.length <= 4 || /[$0-9]/.test(name);
}

function keyOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return null;
}

function loaderInfo(statement) {
  if (statement.type !== "VariableDeclaration") return null;
  for (const declarator of statement.declarations) {
    if (
      declarator.id.type === "Identifier" &&
      declarator.init?.type === "CallExpression" &&
      declarator.init.callee.type === "Identifier" &&
      declarator.init.callee.name === "T"
    ) {
      return { loaderName: declarator.id.name };
    }
  }
  return null;
}

function exportTableExports(statement) {
  if (statement.type !== "ExpressionStatement") return null;
  const call = statement.expression;
  if (
    call.type !== "CallExpression" ||
    call.callee.type !== "Identifier" ||
    call.callee.name !== "j$"
  ) {
    return null;
  }
  const objectArg = call.arguments[1];
  if (objectArg?.type !== "ObjectExpression") return null;
  const exports = [];
  for (const property of objectArg.properties) {
    if (property.type !== "ObjectProperty") continue;
    const key = keyOf(property.key);
    if (key) exports.push(key);
  }
  return exports;
}

function collectDeclaredNames(statement, out) {
  if (statement.type === "FunctionDeclaration" && statement.id) {
    out.push(statement.id.name);
  } else if (statement.type === "ClassDeclaration" && statement.id) {
    out.push(statement.id.name);
  } else if (statement.type === "VariableDeclaration") {
    for (const declarator of statement.declarations) {
      if (declarator.id.type === "Identifier") out.push(declarator.id.name);
    }
  }
}

async function main() {
  const source = await readFile(INPUT, "utf8");
  const ast = parse(source, {
    sourceType: "script",
    allowReturnOutsideFunction: true,
    plugins: ["explicitResourceManagement"],
  });
  const programStatement = ast.program.body[0];
  if (programStatement?.type !== "ExpressionStatement" || programStatement.expression.type !== "FunctionExpression") {
    throw new Error("Unexpected top-level shape; cli.renamed.js should be a single function expression statement");
  }
  const topStatements = programStatement.expression.body.body;

  const modules = [];
  let buffer = { decls: [], exports: [], startLine: null };
  for (const statement of topStatements) {
    const loader = loaderInfo(statement);
    if (loader) {
      const semanticDecls = buffer.decls.filter((name) => !isMinified(name));
      modules.push({
        loaderName: loader.loaderName,
        loaderLine: statement.loc.start.line,
        startLine: buffer.startLine,
        declCount: buffer.decls.length,
        minifiedDeclCount: buffer.decls.length - semanticDecls.length,
        semanticDeclCount: semanticDecls.length,
        exportTable: buffer.exports,
        semanticDecls,
      });
      buffer = { decls: [], exports: [], startLine: null };
      continue;
    }
    if (buffer.startLine === null) buffer.startLine = statement.loc?.start.line ?? null;
    const exports = exportTableExports(statement);
    if (exports) {
      buffer.exports.push(...exports);
      continue;
    }
    collectDeclaredNames(statement, buffer.decls);
  }

  const buckets = new Map(THEMES.map(([name]) => [name, []]));
  const matched = new Set();
  for (const module of modules) {
    const blob = ` ${module.semanticDecls.join(" ")} ${module.exportTable.join(" ")} `;
    if (blob.trim().length < 3) continue;
    for (const [name, pattern] of THEMES) {
      if (pattern.test(blob)) {
        buckets.get(name).push(module);
        matched.add(module);
        break;
      }
    }
  }

  const themes = [];
  for (const [name, list] of buckets) {
    if (list.length === 0) continue;
    const sampleNames = [...new Set([...list.flatMap((m) => m.exportTable), ...list.flatMap((m) => m.semanticDecls)])];
    themes.push({
      theme: name,
      moduleCount: list.length,
      lineMin: Math.min(...list.map((m) => m.loaderLine)),
      lineMax: Math.max(...list.map((m) => m.loaderLine)),
      sampleNames: sampleNames.slice(0, 12),
      loaderLines: list.map((m) => m.loaderLine).sort((a, b) => a - b),
    });
  }
  themes.sort((a, b) => b.moduleCount - a.moduleCount);

  const totals = {
    totalModules: modules.length,
    modulesWithExportTable: modules.filter((m) => m.exportTable.length > 0).length,
    modulesWithAnySemantic: modules.filter((m) => m.semanticDeclCount > 0 || m.exportTable.length > 0).length,
    fullyOpaqueModules: modules.filter((m) => m.semanticDeclCount === 0 && m.exportTable.length === 0).length,
    classifiedModules: matched.size,
    unclassifiedSemanticModules: modules.filter((m) => !matched.has(m) && (m.semanticDeclCount > 0 || m.exportTable.length > 0)).length,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_MODULES, `${JSON.stringify({ generatedAt: new Date().toISOString(), input: "claude-code-pkg/src/entrypoints/cli.renamed.js", totals, modules }, null, 2)}\n`);
  await writeFile(OUT_THEMES, `${JSON.stringify({ generatedAt: new Date().toISOString(), input: "claude-code-pkg/src/entrypoints/cli.renamed.js", totals, themes }, null, 2)}\n`);

  console.error(JSON.stringify({ ...totals, themeCount: themes.length, modulesPath: OUT_MODULES, themesPath: OUT_THEMES }, null, 2));
}

main().catch((error) => {
  console.error(`extract-cli-module-map: ${error.message}`);
  process.exitCode = 1;
});
