# Settings, policy, and integrations

This page reverse-engineers settings, managed policy, helper scripts, and local integration paths in the Claude Code runtime.

Use [Settings schema reference](settings-schema-reference.md) for the canonical settings roots/key groups and [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md) for env-var-only controls. This page owns the settings/policy/integration behavior narrative.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| ProjectUserSettingsSchema | `.claude/settings.json` | Project/user settings overlay schema text. |
| TranscriptRetentionSetting | `cleanupPeriodDays` | Transcript retention setting. |
| ManagedUiPolicySettings | `disableAllHooks`, `statusLine`, `disableAgentView` | Managed settings/policy surfaces for hooks/status/agent view. |
| RemoteControlPolicySetting | `disableRemoteControl` | Managed policy surface for Remote Control. |
| SkillShellPolicySetting | `disableSkillShellExecution` | Managed policy surface for shell execution in skills/custom slash commands. |
| ApiKeyHelperSetting | `apiKeyHelper` | Settings helper script that outputs authentication values. |
| OtelHeadersHelperOrigin | `isOtelHeadersHelperFromProjectOrLocalSettings`, `checkHasTrustDialogAccepted` | Project/local OTEL header helpers are suppressed until workspace trust is accepted. |
| StatusLineSettingsMutation | `~/.claude/settings.json` | Status-line setup instructions mutate user settings. |
| SettingsInjectionFlag | `--settings <file-or-json>` | Adds settings JSON file or inline JSON for a session. |
| IdeIntegrationFlag | `--ide` | Auto-connect IDE integration flag. |
| ChromeIntegrationFlag | `--chrome` | Chrome integration flag. |
| StartupFileResourceFlag | `--file <specs...>` | Startup file-resource download integration. |
| SafeModeBoundary | `--safe-mode`, `CLAUDE_CODE_SAFE_MODE` | Disables project/user customizations for recovery while preserving admin policy, auth, core tools, and permissions. |
| ProcessWrapperPolicy | `processWrapper`, `CLAUDE_CODE_PROCESS_WRAPPER` | Routes the background supervisor and covered self-spawns through a required corporate launcher. |
| DisableSideloadFlagsPolicy | `disableSideloadFlags` | Managed policy rejects inline plugin URL/dir, custom agent, and non-SDK MCP sideload flags. |
| DisableClaudeAiConnectorsSetting | `disableClaudeAiConnectors` | Disables claude.ai connector loading and classifies pending connectors as disabled. |
| TeamOnboardingPolicy | `allow_team_onboarding` | Organization policy controls the user-only onboarding workflow and its optional share layer. |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `TrustedPathGlobalConfig` | 169401 | `isPathTrusted`, `setPathTrusted`, `checkHasTrustDialogAccepted`, `resetTrustDialogAcceptedCache`, `isGlobalConfigKey`, `saveGlobalConfig`, `saveCurrentProjectConfig`, `isProjectConfigKey`, `getRemoteControlAtStartup`, `getDaemonColdStart`, `isAutoUpdaterDisabled`, `shouldSkipPluginAutoupdate`, `recordFirstStartTime` | [Bundle module map — permission, trust, hooks, and policy](../99-research-atlas/module-map-from-renamed-cli.md#permission-trust-hooks-and-policy) |
| `ProxyClientFactory` | 91577 | `shouldBypassProxy`, `prefetchProxyAuthFromHelperIfSafe`, `getWebSocketProxyUrl`, `getProxyUrl`, `getProxyFetchOptions`, `getProxyAuthFromHelperCached`, `getProxyAuthFromHelper`, `getProxyAgent` | [Bundle module map — remote control, feature flags, networking](../99-research-atlas/module-map-from-renamed-cli.md#remote-control-feature-flags-networking) |
| `LspIdeClient` | 428870 | `createLSPClient` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |

## Settings layers

```mermaid
flowchart TD
    User[~/.claude/settings.json] --> Merge[Settings merge]
    Project[.claude/settings.json] --> Merge
    Local[.claude/settings.local.json] --> Merge
    Managed[managed settings / policy] --> Merge
    Flags[--settings / --managed-settings / --setting-sources] --> Merge
    Merge --> Runtime[Runtime config]
    Runtime --> Tools[Tools and permissions]
    Runtime --> Context[Prompt/context]
    Runtime --> Integrations[IDE / Chrome / MCP / plugins]
```

## Confirmed settings and policy groups

| Group | Examples | Runtime implication |
|---|---|---|
| Settings roots | `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json` | User, project, and local overlays participate in runtime config. |
| Retention | `cleanupPeriodDays` | Controls chat transcript retention period. |
| Hooks/status line | `disableAllHooks`, `statusLine`, `subagentStatusLine` | Enables/disables hook and status-line execution. |
| Remote/agent policy | `disableRemoteControl`, `disableAgentView` | Managed policy can disable Remote Control and agent UI paths. |
| Skills/slash safety | `disableSkillShellExecution` | Replaces inline shell execution in skills/custom slash commands with placeholders. |
| Authentication and telemetry helpers | `apiKeyHelper`, `proxyAuthHelper`, `otelHeadersHelper` | Lets settings point to helper scripts for credentials/proxy auth and telemetry headers. |
| Plugin/MCP config | `mcpServers`, plugin marketplaces, output styles, hooks | Integrations can be contributed through settings and plugins. |
| Hosted connector policy | `disableClaudeAiConnectors` | Prevents claude.ai connector configs/tools from loading, without disabling ordinary local MCP configs. |
| Team onboarding policy | `allow_team_onboarding` | Controls `/team-onboarding`; hosted sharing adds OAuth, traffic, and rollout gates. |
| IDE/Chrome/file resources | `--ide`, `--chrome`, `--file` | Adds editor/browser/file startup integration surfaces. |
| Accessibility/recovery | `axScreenReader`, `--ax-screen-reader`, `--safe-mode` | Selects the [screen-reader-friendly classic renderer](../01-runtime-lifecycle/accessibility-and-screen-reader-mode.md) or enters [configuration-isolation recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md). |
| Workflow/model/version policy | `disableWorkflows`, `availableModels`, `enforceAvailableModels`, `requiredMinimumVersion`, `requiredMaximumVersion` | Constrains orchestration, model resolution, and allowed client builds. |
| Corporate launch | `processWrapper`, `CLAUDE_CODE_PROCESS_WRAPPER` | Ensures background supervisors/workers and covered self-spawns use the configured launcher. |

## Security interpretation

The settings schema exposes both capability-enabling and capability-disabling controls. This matters because the runtime accepts rich extension points—hooks, plugins, MCP, custom slash commands, status lines, helper scripts—but also exposes managed-policy switches that can disable or constrain those extension points.

## Helper-script trust origin

Helper scripts are sensitive because they execute local commands to obtain credentials or headers. The decoded auth/settings chunk shows `otelHeadersHelper` is considered project/local-owned only when the merged helper command exactly matches the value from `projectSettings` or `localSettings`. In that case `getOtelHeadersFromHelper` returns an empty header object until the workspace trust dialog has been accepted, instead of executing the helper early.

This mirrors the broader trust-boundary pattern: helper script settings can extend runtime behavior, but project/local helper execution is gated by workspace trust.

## Recovery, sideload, and process-launch boundaries

[`--safe-mode`](../05-hosted-agent-ops/safe-mode-and-recovery.md) sets `CLAUDE_CODE_SAFE_MODE=1` and disables `CLAUDE.md`, skills, plugins, hooks, MCP servers, custom commands/agents, output styles, workflows, custom themes, keybindings, and similar customizations. Managed policy still applies, and authentication, model selection, built-in tools, and permissions continue normally. This makes safe mode a configuration-isolation diagnostic, not a permission bypass.

Managed `disableSideloadFlags` closes CLI-only extension paths by rejecting `--plugin-dir`, `--plugin-url`, `--agents`, and non-SDK `--mcp-config` at startup. Approved marketplaces/settings remain the intended deployment path.

`processWrapper` (or the higher-precedence `CLAUDE_CODE_PROCESS_WRAPPER`) is an argv prefix for the background supervisor, sessions/workers it hosts, and covered self-spawns. The runtime validates that the launcher remains executable, retires an older unwrapped supervisor, preserves wrapper state across background upgrades, and exposes the recorded launcher through daemon status. Project/local settings cannot set it.

Claude in Chrome is a first-class integration in this build (`--chrome` / `--no-chrome`) and is generally available subject to auth, host, extension, policy, and safe-mode gates. Browser calls remain tool calls and therefore still cross normal plan-mode and permission checks.

`disableClaudeAiConnectors` is narrower than a global MCP kill switch: the runtime checks it for `claudeai`-scoped configs and connector startup, while normal settings/plugin/flag MCP configs retain their own policies. `allow_team_onboarding` is an organization capability policy rather than a model permission; it gates the user-invoked local-history workflow, and [hosted guide sharing](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md) applies additional account/traffic/feature checks.

## Related docs

- [Settings schema reference](settings-schema-reference.md)
- [Accessibility and screen-reader mode](../01-runtime-lifecycle/accessibility-and-screen-reader-mode.md)
- [Safe mode and recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md)
- [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md)
- [Telemetry and tracing](../05-hosted-agent-ops/telemetry-and-tracing.md)
- [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)
- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)
