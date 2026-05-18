# Settings schema reference

This page centralizes source-visible settings roots, policy keys, and configuration groups that shape Claude Code tools, prompts, integrations, hooks, sessions, and operations.

## Scope and caveats

- This is a **known-settings reference**, not a complete JSON Schema dump. The complete schema is embedded in the minified bundle and may also be extended by plugins or managed policy.
- Settings names here are included when they are already anchored in implementation pages or are high-signal strings in `cli.renamed.js`.
- Runtime precedence can be affected by `--setting-sources`, managed policy, and per-invocation flags; docs should avoid assuming one universal merge order for every mode.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| ProjectUserSettingsSchema | `.claude/settings.json` | Project/user settings overlay schema text. |
| TranscriptRetentionSetting | `cleanupPeriodDays` | Transcript retention setting. |
| ManagedUiPolicySettings | `disableAllHooks`, `statusLine`, `disableAgentView` | Managed settings/policy surfaces for hooks/status/agent view. |
| RemoteControlPolicySetting | `disableRemoteControl` | Managed policy surface for Remote Control. |
| SkillShellPolicySetting | `disableSkillShellExecution` | Managed policy surface for shell execution in skills/custom slash commands. |
| ApiKeyHelperSetting | `apiKeyHelper` | Settings helper script that outputs authentication values. |
| EmbeddedSettingsValidator | `PP().safeParse` | Loaded settings are validated through the embedded schema. |
| EnabledPluginsSetting | `enabledPlugins` | Settings surface for plugin enablement and version constraints. |
| ExtraMarketplacesSetting | `extraKnownMarketplaces` | Settings surface for repository/team marketplace registration. |
| StrictMarketplacePolicy | `strictKnownMarketplaces` | Managed marketplace allowlist. |
| BlockedMarketplacePolicy | `blockedMarketplaces` | Managed marketplace blocklist. |
| SandboxOverridePolicy | `dangerouslyDisableSandbox` | Settings/policy schema text controlling sandbox override behavior. |
| StatusLineSettingsMutation | `~/.claude/settings.json` | Status-line setup instructions mutate user settings. |
| SettingsInjectionFlag | `--settings <file-or-json>` | Adds settings JSON file or inline JSON for a session. |
| IdeIntegrationFlag | `--ide` | Auto-connect IDE integration flag. |
| ChromeIntegrationFlag | `--chrome` | Chrome integration flag. |
| StartupFileResourceFlag | `--file <specs...>` | Startup file-resource download integration. |

## Bundle module in `cli.renamed.js`

| Semantic alias | Loader line(s) | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `SettingsFileLoader` | 62036, 62450 | `parseSettingsFile`, `parseSettingsFileUncached`, `parseRemoteManagedSettings`, `loadManagedFileSettingsFromDir`, `updateSettingsForSource`, `settingsMergeCustomizer`, `shouldIncludeParentTier`, `rawSettingsContainsKey` | [Bundle module map — permission, trust, hooks, and policy](../99-research-atlas/module-map-from-renamed-cli.md#permission-trust-hooks-and-policy) |

## Settings roots and loaders

| Surface | Scope | Notes |
|---|---|---|
| `~/.claude/settings.json` | User/global | User-level persisted configuration. |
| `.claude/settings.json` | Project | Repository/project configuration. |
| `.claude/settings.local.json` | Local project | Local overrides that are usually not committed. |
| Managed settings / policy | Organization/admin | Can disable or constrain capabilities regardless of local preferences. |
| `--settings <file-or-json>` | Per invocation | Adds settings JSON file or inline JSON. |
| `--managed-settings <file-or-json>` | Per invocation / policy test path | Loads managed-policy-style settings from a file or inline JSON. |
| `--setting-sources <sources...>` | Per invocation | Selects setting source order/participation for a run. |

## Known settings and policy groups

| Group | Setting or surface examples | Runtime implication | Primary owner |
|---|---|---|---|
| Retention/session cleanup | `cleanupPeriodDays` | Bounds how long local transcript/project state is retained. | [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md) |
| Hooks and status line | `disableAllHooks`, `hooks`, `statusLine`, `subagentStatusLine` | Enables/disables hooks and status-line execution. | [Hooks and events reference](hooks-and-events-reference.md) |
| Remote and agent policy | `disableRemoteControl`, `disableAgentView` | Managed policy can disable Remote Control and agent UI paths. | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |
| Skill/slash safety | `disableSkillShellExecution` | Replaces or prevents shell execution in skills/custom slash commands. | [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md) |
| Authentication helpers | `apiKeyHelper`, `proxyAuthHelper`, `enterpriseGateway` | Points to credential/proxy helper mechanisms. | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| MCP and plugins | `mcpServers`, plugin marketplaces, plugin-provided hooks/output styles/MCP servers | Adds external capability providers. | [MCP, plugins, and hooks](mcp-plugins-hooks.md) |
| Tools and permissions | `allowedTools`, `disallowedTools`, permission mode settings, `denyRead`-style exclusions | Shapes model-visible tools and approval/deny behavior. | [Tool inventory and schemas](tool-inventory-and-schemas.md) |
| Prompt/context | system prompt, append prompt, output styles, memory/context exclusions | Shapes model-visible context and prompt assembly. | [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md) |
| Integrations | `--ide`, `--chrome`, `--file` plus integration settings | Adds editor/browser/file-resource integration surfaces. | [Settings, policy, and integrations](settings-policy-and-integrations.md) |
| Sandbox/runtime behavior | sandbox mode, ignore-file behavior, tool-specific safety switches | Constrains process/file/network access after permission approval. | [Sandbox and isolation](sandbox-and-isolation.md) |

## Settings versus flags versus env vars

| Surface | Good for | Reference |
|---|---|---|
| Settings files | Persisted user/project/local policy and integration configuration. | This page. |
| Root CLI flags | Per-invocation mode, tool, prompt, session, model, and integration overrides. | [Command-line reference](../01-runtime-lifecycle/command-line-reference.md) |
| Environment variables | Credentials, provider selection, debug/telemetry gates, feature kill switches, remote tokens. | [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md) |
| Managed policy | Organization/admin constraints that can disable high-risk features. | [Settings, policy, and integrations](settings-policy-and-integrations.md) |

## Complete schema extraction boundary

The complete settings validator is present in the bundle, but it is embedded as minified schema construction rather than an exported JSON Schema document. The high-signal validation anchor is `PP().safeParse` around line ~187: loaded JSON is parsed, preflight errors are collected, and only the parsed `.data` is returned as settings.

| Layer | What is source-confirmed | Documentation status |
|---|---|---|
| Embedded validator | `PP().safeParse` validates loaded settings after JSON/object parsing. | Anchored here; not expanded into a full generated JSON Schema. |
| Project/user/local settings | `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json` | Covered as roots and loaders. |
| Managed/policy settings | `disableRemoteControl`, `disableAgentView`, `disableAllHooks`, `disableSkillShellExecution`, marketplace allow/block lists | Covered as policy groups; exact organization policy envelopes may vary. |
| Plugin marketplaces | `enabledPlugins`, `extraKnownMarketplaces`, `strictKnownMarketplaces`, `blockedMarketplaces` | Covered here and in [MCP, plugins, and hooks](mcp-plugins-hooks.md). |
| Sandbox-sensitive settings | `dangerouslyDisableSandbox` schema text and sandbox policy pages | Covered as policy boundary, not as a guarantee that a command bypasses sandboxing. |

The remaining “complete schema” gap is mechanical extraction: a future script could reconstruct or evaluate the embedded schema into a stable JSON/Markdown reference. Until then, this page should stay a known-settings reference with exact anchors for high-signal keys, rather than hand-copying every minified schema branch.

## De-duplication rule

When adding new settings detail, prefer this ownership split:

1. Put the key name, scope, and owning behavior here.
2. Put call paths and runtime effects in the owning implementation page.
3. Put env-var-only toggles in [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md), not here.
4. Keep plugin-specific schema extensions in plugin/MCP docs until confirmed as general settings.

## Related docs

- [Settings, policy, and integrations](settings-policy-and-integrations.md)
- [Tool inventory and schemas](tool-inventory-and-schemas.md)
- [Hooks and events reference](hooks-and-events-reference.md)
- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md)