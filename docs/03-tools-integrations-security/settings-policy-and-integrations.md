# Settings, policy, and integrations

This page reverse-engineers settings, managed policy, helper scripts, and local integration paths in the Claude Code runtime.

Use [Settings schema reference](settings-schema-reference.md) for the canonical settings roots/key groups, [Status line runtime and command protocol](status-line.md) for the configured command's execution lifecycle, and [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md) for env-var-only controls. This page owns the settings/policy/integration behavior narrative.

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
| MarketplaceDeclarationSetting | `extraKnownMarketplaces`, `sQ`, `Uhy`, `bJr` | Scoped marketplace declaration state merged from settings. |
| MarketplaceMaterializedState | `known_marketplaces.json`, `Ng`, `lxe` | Separate validated local state for acquired marketplace sources and cache locations. |
| AutoModeSetupCommand | `auto-mode-setup`, `War()`, `--propose`, `--apply-file` | Two-stage reconnaissance/proposal/reviewed-file application flow [~497,000–497,618](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L497000). |
| ConfigShorthandCommand | `parseConfigShorthand`, `applyConfigShorthand`, `listConfigKeys` | Validates and applies the settings exposed through `/config key=value` [~502,418–502,640](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L502418). |
| AgentConfigImport | `GSo()`, `tCy`, `Codex`, `Gemini`, `--yes` | Deterministic scan/preview/apply adapters for Codex and Gemini configuration [~502,800–504,507](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L502800). |
| InitPromptWorkflow | `name: "init"`, `sCy()`, `lCy()` | Legacy CLAUDE.md prompt or gated multi-phase CLAUDE.md/skill/hook setup workflow [~504,790](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L504790). |
| KeybindingsCommand | `name: "keybindings"`, `PCy()` | Creates/opens the keybindings template with safe-mode messaging [~505,500–505,525](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L505500). |
| StatusLineCommand | `name: "statusline"`, `disableModelInvocation: true` | User-only prompt that launches the status-line setup agent and refuses in safe mode [~561,778](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L561778). |
| StatusLineRuntime | `executeStatusLineCommand`, `pNb`, `fNb`, `Juf` | Separate runtime path sends JSON to the configured command, refreshes/cancels it, and renders successful stdout [~577,937](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L577937), [~831,800](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L831800). |
| RemoteEnvironmentSetting | `remote.defaultEnvironmentId`, `/remote-env` | Clears a local override and writes the selected hosted-environment ID at user scope [~813,295–813,790](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L813295). |
| WebGitHubCredentialSetup | `/web-setup`, `/v1/code/github/import-token` | Confirms hosted use of the local GitHub CLI token and imports it through the authenticated remote API [~828,230–828,760](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L828230). |

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
| Hooks/status line | `disableAllHooks`, `statusLine`, `subagentStatusLine` | Selects command-derived main/agent-row UI; policy and safe mode can reduce selection to managed values. See [Status line runtime and command protocol](status-line.md). |
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

## Marketplace declarations versus local state

`extraKnownMarketplaces` is a settings declaration, not the marketplace cache itself. `Uhy` merges declarations across eligible settings sources, while `sQ` adds fallback/seed-related declarations and, after workspace trust, the project/local and added-directory view. Before trust, project/local declarations are excluded from that effective declaration set. `bJr(name, declaration, source)` persists one declaration to a selected settings source.

Materialization is tracked separately in `known_marketplaces.json`. `Ng` loads and schema-validates that file; `lxe` validates and writes records containing the source, install location, and update metadata. `cct` policy-checks a source, reuses an equivalent existing materialization when possible, invokes the source-specific `bSs` acquisition path, and records the result. Consequently:

- deleting or overriding one settings declaration does not by itself prove the cache should disappear;
- `DDt(name, scope)` keeps state and installed plugins when another settings scope, managed declaration, or seed still owns the name;
- final removal deletes the state/cache and cleans marketplace-specific enabled/installed plugin records;
- `strictKnownMarketplaces` and `blockedMarketplaces` constrain acquisition/use, but are not substitutes for `known_marketplaces.json`;
- a settings schema entry for an NPM marketplace source is not executable support—`bSs` explicitly throws `NPM marketplace sources not yet implemented` in this build.

See [Plugin marketplace lifecycle](mcp-plugins-hooks.md#plugin-marketplace-lifecycle) for the CLI add/list/update/remove paths and acquisition branches.

## Configuration command mechanisms

The complete name/gate inventory is in the [built-in interactive-command registry](../01-runtime-lifecycle/command-line-reference.md#built-in-interactive-command-registry). The commands below matter here because they read or mutate settings/configuration through additional safety boundaries rather than being simple UI shortcuts.

### `/config`: panel versus shorthand

Bare `/config` (`/settings`) opens the interactive panel. `/config key=value [key=value ...]` uses the same computed setting descriptors but exposes only values that can be represented safely as a boolean or enumerated/coerced value.

The shorthand path:

1. accepts one `key=value` containing spaces in its value, or multiple whitespace-delimited pairs;
2. resolves keys case-insensitively against the settings currently available to this session;
3. accepts `true/1/on/yes` and `false/0/off/no` for booleans;
4. checks enumerated values case-insensitively and uses explicit coercers for managed free-form fields such as language;
5. invokes the setting descriptor's own `onChange` persistence path; and
6. reports when a higher-precedence environment/policy/flag source still controls the effective value.

Consent-gated settings cannot normally be enabled by shorthand. A false value can withdraw an already-active consent, but enabling requires the panel's consent surface. Managed-enum rows without a setter also direct the user to their dedicated command (for example `/channel`) or `/config`. `listConfigKeys()` and argument completion omit consent-gated entries, so the usage list is an executable whitelist rather than every key in the settings schema.

### `/auto-mode-setup`: proposal before mutation

`/auto-mode-setup` is a separate workflow from the top-level `claude auto-mode config|defaults|critique|reset` command family. The interactive variant presents the setup/review UI. Its text implementation supports non-interactive orchestration but deliberately refuses a one-shot model-output-to-settings write.

```mermaid
flowchart TD
    Args[--wizard posture/scope/depth --propose] --> Recon[mechanically gather repo/settings/history evidence]
    Recon --> Model[model emits six-array JSON proposal]
    Model --> Parse[schema + rule validation; one formatting-repair attempt]
    Parse --> Review[caller shows proposal and writes reviewed JSON]
    Review --> Apply[--apply-file absolute path]
    Apply --> Path[path + permission + file-identity guards]
    Path --> Reparse[reparse and revalidate proposal]
    Reparse --> Settings[append/replace autoMode + approved allow removals]
```

The proposal schema requires `environment`, `allow`, `soft_deny`, `hard_deny`, `remove_from_permissions_allow`, and `notes`, all arrays of strings. The parser normalizes entries, validates the final auto-mode shape, strips unsafe broad allow rules, and permits a proposed removal only when the mechanically gathered settings section actually contained that exact rule. A malformed first response gets one JSON-format repair request; it is not accepted as prose.

The non-interactive grammar exposes only:

- `--wizard posture=<personal|open-source|enterprise|mixed> scope=<all|project> depth=<both|shell|repos|here> --propose`; and
- `--apply-file <absolute-path>`.

`--apply` is rejected because it would persist unreviewed model output. `--apply-file` accepts only an absolute path under the system temp directory or Claude config directory, rejects paths denied by read permission, opens a regular file with no-follow and single-link requirements, sniffs encoding, caps it at 1 MiB, and reruns schema/rule validation before calling the settings writer. The model therefore proposes; the reviewing host/user controls the file that is applied.

### `/import`: deterministic adapters with a same-session confirmation latch

The feature-gated `/import [codex|gemini]` command has separate Codex and Gemini adapters. It can map selected instruction files, commands/prompts, MCP servers, subagents, skills, and permission settings, while recording unmappable items for manual follow-up.

The non-interactive flow is intentionally two-step:

1. `/import [source]` scans and returns a preview prompt. The process stores the exact scan result in an in-memory latch.
2. `/import [source] --yes` applies only if that same process already previewed the same source. Plain one-shot `claude -p` invocations cannot carry this latch and are directed to terminal `claude import` instead.

`--yes` applies unflagged **user-scope** items only. Project-scope items, warning-bearing entries, and copied skill directories are held back for the interactive checkbox picker because repository configuration can be attacker-authored and bundled skill scripts/frontmatter become active capabilities. `--dry-run` executes the same apply decisions without writing.

The adapters apply several deterministic guards before any write:

- resolved source/target paths must remain inside the expected config/project root;
- project reads and writes reject symlink components; user skill paths are realpath-contained;
- imported names are reduced to a safe filename alphabet, and existing targets are never overwritten;
- file reads are size-bounded (10 MiB for imported text); and
- Codex/Gemini prompt translation rejects shell-execution markers, nested braces/backticks, dangling `!` markers, or argument-placeholder combinations that could become live Claude Code shell expansion.

Unmappable entries can be written to `skills/import-to-claude-code/SKILL.md` under the Claude config directory. The copied labels are explicitly framed as untrusted data; project-level labels are summarized by count rather than copied into the user-level fallback skill.

### `/init`, `/keybindings`, and `/statusline`

| Command | Source-confirmed behavior |
|---|---|
| `/init` | The legacy arm asks the model to analyze the repo and create/improve a concise root CLAUDE.md. The gated new arm first checks only the root CLAUDE.md, asks whether to create project/personal files plus skills/hooks, explores through a subagent, asks only code-unanswerable questions, presents an artifact proposal, and obtains confirmation before writes. Hook creation delegates to `/update-config`'s verified construction flow. |
| `/keybindings` | Resolves `~/.claude/keybindings.json`, creates parent directories, writes a schema/docs-bearing template only with exclusive-create semantics, then opens the file in the configured editor. Existing files are opened, not replaced. In safe mode it warns that changes will take effect after leaving safe mode. |
| `/statusline` | Is a built-in prompt with `disableModelInvocation: true` and `disableNonInteractive: true`; only the user can launch it interactively. It delegates to the `statusline-setup` subagent with narrow Read/Edit permissions. Safe mode refuses before delegation because only the managed status line can render there. Setup and the later deterministic command/JSON/render path are separated in [Status line runtime and command protocol](status-line.md). |
| `/theme`, `/tui`, `/focus` | Are dedicated interactive controls because their state affects immediate rendering/relaunch behavior. The shorthand settings panel may display them but does not replace their specialized transitions. |
| `/reload-plugins`, `/reload-skills`, `/skill-doctor` | Rebuild or inspect extension state rather than directly editing settings. Their cache and dependency behavior is documented in [MCP, plugins, and hooks](mcp-plugins-hooks.md#interactive-reload-and-skill-health-commands). |
| `/remote-env` | Lists hosted targets, clears a local `remote.defaultEnvironmentId` override, and writes the chosen ID to user settings while warning if a higher-precedence source still wins. See [Interactive remote setup commands](../04-sessions-persistence-remote/remote-control-and-teleport.md#interactive-remote-setup-commands). |
| `/web-setup` | After explicit confirmation, imports the redacted in-memory `gh auth token` into the hosted service and can best-effort create the first default environment. It does not silently replace an existing GitHub App connection. See [Interactive remote setup commands](../04-sessions-persistence-remote/remote-control-and-teleport.md#interactive-remote-setup-commands). |

## Related docs

- [Status line runtime and command protocol](status-line.md)
- [Settings schema reference](settings-schema-reference.md)
- [Accessibility and screen-reader mode](../01-runtime-lifecycle/accessibility-and-screen-reader-mode.md)
- [Safe mode and recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md)
- [Environment variables reference](../05-hosted-agent-ops/environment-variables-reference.md)
- [Telemetry and tracing](../05-hosted-agent-ops/telemetry-and-tracing.md)
- [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)
- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)
