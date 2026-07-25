# Command-line reference

This page is the canonical source-visible inventory of root flags, command families, aliases, gates, and mode-specific CLI surfaces. Process routing and mode dispatch remain in [CLI main paths](cli-main-paths.md), so this reference does not duplicate the bootstrap narrative.

## Scope and caveats

- This is a source-anchored reference for the analyzed `cli.renamed.js` bundle, not a replacement for live `claude --help` output.
- Hidden and feature-gated options are included when existing docs have direct anchors.
- The bundle is minified, so approximate line numbers and byte offsets are search handles rather than stable public API names.

## Source anchors

| Semantic alias | Anchor | Meaning |
| --- | --- | --- |
| CommanderRoot | `Usage: claude [options] [command] [prompt]` | Commander root construction and invocation shape. |
| ClaudeRootCommand | `Claude Code - starts an interactive session by default` | Root command name and description. |
| PrintModeFlag | `-p, --print` | Selects non-interactive print/headless mode. |
| ToolAllowListFlag | `--allowedTools, --allowed-tools <tools...>` | Tool allow-list flag. |
| PermissionModeFlag | `--permission-mode <mode>` | Session permission mode selector. |
| ContinueSessionFlag | `-c, --continue` | Continue the most recent conversation in the current directory. |
| ResumeSessionFlag | `-r, --resume [value]` | Resume by session ID or open picker/search. |
| RemoteSessionFlag | `--remote [description\|session_id\|url]` | Remote session creation/attach flag. |
| RemoteControlFlag | `--remote-control [name]` | Remote Control flag. |
| DoctorCommand | `doctor — Check the health of your Claude Code installation` | Non-interactive installation/settings health check. |
| UpdateCommandFamily | `update|upgrade` | Update/upgrade command family. |
| CoreInteractiveRegistry | [`Hur()` / `getBuiltinCommands()` at ~567,141–567,875](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L567141) | Memoized core `local`, `local-jsx`, and built-in `prompt` command array. |
| CommandAggregator | [`_xo()` / `getCommands()` at ~567,226–567,327](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L567226) | Merges skill directories, workflows, plugin/MCP/bundled skills, and core commands, then resolves collisions and gates. |
| BundledSkillRegistrar | [`Lu()` / `fhs()` at ~421,026–421,095](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421026) | Turns bundled skill metadata and assets into `prompt` commands. |
| SurfaceFilters | `filterCommandsForHeadless`, `filterCommandsForRemoteMode`, `isThinClientSafe` | Selects commands that can cross non-interactive, Remote Control, and thin-client boundaries. |
| AgentTeamsRawArg | `process.argv.includes("--agent-teams")` | Experimental team gate inspects raw argv; this spelling is not registered in the Commander root option table [~333,255–333,264](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L333255). |
| HiddenTeammateModeFlag | `--teammate-mode <mode>` | Hidden root option selecting `auto`, `tmux`, `iterm2`, or `in-process` [~958,950](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L958950). |

## Root invocation modes

| Mode | Representative surface | Behavior |
|---|---|---|
| Interactive TUI | default TTY invocation | Starts the interactive session loop after trust/auth/settings/context setup. |
| Headless/print | `-p`, `--print` | Runs the scriptable path with stdout result/stream framing. |
| SDK-style headless | `--sdk-url`, stream/control frames | Exposes structured frames and control requests for external hosts. |
| Resume/continue | `--continue`, `--resume`, `--session-id` | Restores a local JSONL session into the live envelope. |
| Remote/teleport/control | `--remote`, `--teleport`, `--remote-control`, `--rc` | Adds bridge/session-ingress control around the same session model. |
| Recovery/accessibility | `--safe-mode`, `--ax-screen-reader` | [Safe mode](../05-hosted-agent-ops/safe-mode-and-recovery.md) isolates broken customizations; [screen-reader mode](accessibility-and-screen-reader-mode.md) selects the classic flat renderer. |

## Root flag families

| Family | Flags | Primary owner |
|---|---|---|
| Diagnostics/recovery | `-d, --debug [filter]`, `--debug-file`, `--verbose`, `--safe-mode` | [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md), [Safe mode and recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md) |
| Headless/SDK output | `-p, --print`, `--output-format`, `--input-format`, `--json-schema`, `--include-partial-messages`, `--include-hook-events`, `--replay-user-messages`, `--forward-subagent-text`, `--prompt-suggestions` | [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md) |
| Thinking and budget | `--effort`, `--max-budget-usd`, `--fallback-model` | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md) |
| Tools and permissions | `--tools`, `--allowedTools`, `--allowed-tools`, `--disallowedTools`, `--disallowed-tools`, `--permission-mode`, `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions` | [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md) |
| Prompt and context | `--system-prompt`, `--append-system-prompt`, `--add-dir`, `--exclude-dynamic-system-prompt-sections` | [Prompt assembly scenarios](../02-context-model-loop/prompt-assembly-scenarios.md) |
| Sessions | `-c, --continue`, `-r, --resume`, `--fork-session`, `--from-pr`, `--no-session-persistence`, `--session-id`, `--name`, `--bg` | [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md) |
| Models and auth | `--model`, `--fallback-model`, `--betas` | [Models, providers, and auth](../02-context-model-loop/models-providers-auth.md) |
| Settings and integrations | `--settings`, `--setting-sources`, `--mcp-config`, `--strict-mcp-config`, `--plugin-dir`, `--plugin-url`, `--agents`, `--agent`, `--ide`, `--chrome`, `--file` | [Settings schema reference](../03-tools-integrations-security/settings-schema-reference.md) |
| Experimental Agent Teams | raw argv `--agent-teams`; hidden `--teammate-mode`; child-only `--agent-id`, `--agent-name`, `--team-name`, `--agent-color`, `--parent-session-id`, `--plan-mode-required`, `--agent-type` | [Agent Teams](../06-agents-automation/agent-teams.md) |
| Accessibility | `--ax-screen-reader` | [Accessibility and screen-reader mode](accessibility-and-screen-reader-mode.md) |
| Remote and deep links | `--remote`, `--teleport`, `--remote-control`, `--rc`, `--remote-control-session-name-prefix`, `--prefill`, `--deep-link-origin` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |

`--agent-teams` is unusual: `isAgentSwarmsEnabled()` checks for the exact token in raw `process.argv`, but no matching Commander `.option(...)` registration appears in this retained build. It should therefore be treated as an internal/experimental argv signal rather than an advertised help option; `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is the explicit parsed environment opt-in. `--teammate-mode` and the identity flags are registered but hidden, primarily for parent/child teammate launches.

## Command families

| Command | Anchor | Runtime role |
|---|---|---|
| `auth` | `H.command("auth")` | Login, logout, and status flows for account credentials. |
| `mcp` | `McpCommandRegistrar` | Manages MCP servers and can start the Claude Code MCP server. |
| `mcp serve` | `command("serve")`, line ~9173, byte `0xbf3ccb` | Starts the Claude Code MCP server. |
| `mcp add-from-claude-desktop` | line ~9173, byte `0xbf44e2` | Imports MCP servers from Claude Desktop config. |
| `plugin` / `plugins` | `PluginCommandRegistrar` | Manages plugins, marketplaces, local/session plugins, and plugin capabilities. |
| `project purge [path]` | `H.command("project")` | Deletes project-scoped Claude Code state. |
| `setup-token` | `H.command("setup-token")` | Sets up a long-lived authentication token flow. |
| `agents` | `H.command("agents")` | Opens/manages background agents and dispatched sessions. |
| `ultrareview [target]` | `H.command("ultrareview [target]")` | Runs cloud-hosted multi-agent code review. |
| `auto-mode` | `config`, `defaults`, `critique`, `reset` | Inspects, critiques, or resets auto-mode classifier configuration. |
| `remote-control` / `rc` | `H.command("remote-control", {hidden: true}).alias("rc")` | Starts local-session Remote Control. |
| `doctor` | `H.command("doctor")` | Checks auto-updater and related health state. |
| `update` / `upgrade` | `H.command("update").alias("upgrade")` | Checks for and installs updates. |
| `install [target]` | `H.command("install [target]")` | Installs a stable/latest/specific native build. |

### `agents` options

`claude agents` accepts `--json` for a non-TTY JSON array and `--all` to include completed sessions. Dispatch defaults include `--agent`, `--model`, `--effort`, `--permission-mode`, `--settings`, `--setting-sources`, `--add-dir`, `--mcp-config`, `--strict-mcp-config`, and `--plugin-dir`. The JSON state can expose what a session is waiting for; sandbox, MCP-input, and managed-settings prompts are classified as needing input.

## Built-in interactive-command registry

The retained build has two static registration layers plus dynamic additions:

1. `Hur()` references **105 distinct core names** across its conditional branches. A core entry is either `local-jsx` (TUI component), `local` (text/control implementation), or a small number of built-in `prompt` commands.
2. Twenty-nine `Lu({...})` registration sites expand to **32 bundled-skill names** because one site loops over four Artifact templates. `/design` exists in both layers, yielding **136 distinct static names** across core plus bundled layers.
3. `_xo()` prepends filesystem skills, dynamic workflows, builtin-plugin skills, plugin skills, and bundled skills before the core array. `getCommands()` then adds MCP/fallback skills, scopes colliding nested skills, removes shadowed fallbacks, and applies availability plus `isEnabled` gates.

The counts are an artifact inventory, **not** a promise that 136 commands appear in one `/help` menu. Conditional branches do not all coexist, and the inventory deliberately includes account/policy/platform/feature-gated entries, hidden compatibility helpers, and entries whose `isEnabled()` is false in `2.1.215`. Live `/help` remains authoritative for one running account and surface.

### Command kinds and surface rules

| Kind | Execution owner | Surface behavior |
|---|---|---|
| `local-jsx` | Interactive Ink/TUI component | Requires a workspace and Ink by default. It cannot execute directly in headless mode; thin clients need an explicit dispatch route or a `local` twin. |
| `local` | JavaScript handler returning text/control events | Enters headless mode only when `supportsNonInteractive` is true. A same-name `local` entry often acts as the bridge/headless twin of `local-jsx`. |
| `prompt` with `source: "builtin"` | Built-in prompt workflow | Can enter headless mode unless `disableNonInteractive`; model invocation is separately controlled. |
| `prompt` with `source: "bundled"` | `Lu()` skill registration | Direct slash use requires `userInvocable !== false`; `disableModelInvocation` blocks the model/Skill caller but not a direct user invocation. Bundled-skill kill switches can reduce these to user-only or remove them. |

Remote mode accepts only thin-client-safe built-in/bundled prompts plus objects in `REMOTE_SAFE_COMMANDS`. Bridge dispatch similarly uses `BRIDGE_SAFE_COMMANDS` or a same-name `local` fallback. This is why a command can exist in the registry yet be unavailable on a particular remote/headless surface.

### Core session, context, and interface commands

| Command (aliases) | State in `2.1.215` | Current role / mechanism owner |
|---|---|---|
| `/add-dir <path>` | Core TUI | Adds a working root; MCP root-change behavior is in [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md). |
| `/autocompact [auto\|tokens]` | Model/feature gated; TUI + text twin | Reads or writes the effective compaction window; see [Context, memory, compaction, checkpoints, and rewind](../02-context-model-loop/context-memory-compaction-checkpoints.md). |
| `/branch [name]` | Core TUI | Copies the current chain into a new resumable local session; see [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md). |
| `/btw [question]` | Core TUI | Runs a disposable one-turn, no-tool side fork without interrupting the main agent; see [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md#btw-isolated-side-questions). |
| `/cd <path>` | Core TUI | Relocates the live cwd and refreshes cwd-sensitive roots/state. |
| `/clear [name]` (`/reset`, `/new`) | Core local; non-interactive capable | Runs the clear lifecycle, rotates the session identity, and leaves the prior transcript resumable; see [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md). |
| `/color [name\|default]` | TUI + non-interactive twin | Persists a session color and best-effort mirrors its bridge tag. |
| `/compact [instructions]` | Core local; non-interactive capable | Runs manual compaction and `PreCompact` hooks; see [Context, memory, compaction, checkpoints, and rewind](../02-context-model-loop/context-memory-compaction-checkpoints.md). |
| `/context [all]` | TUI + non-interactive twin | Estimates current model, prompt, tool, MCP, agent, memory, skill, and message token use. |
| `/copy [N]` | Core TUI | Copies the latest or Nth-latest assistant response, subject to terminal clipboard support. |
| `/diff` | Core TUI | Opens uncommitted and per-turn file-diff views. |
| `/effort [level\|auto\|ultracode]` | Model-capability gated; TUI + text twin | Applies a supported effort level; `ultracode` combines `xhigh` with workflow orchestration. See [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md). |
| `/exit` (`/quit`) | TUI + local twin | Exits normally, or detaches while a background session keeps running. |
| `/export [filename]` | Core TUI | Exports the current conversation to a file or clipboard. |
| `/fast [on\|off]` | Model/account gated; TUI + text twin | Toggles fast-mode state and its required model; see [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md). |
| `/focus` | Core TUI; fullscreen-sensitive | Toggles the reduced transcript view and synchronizes the view-mode flag when the transport supports it. |
| `/help` | Core TUI | Shows the enabled, advertised command set for the current runtime. |
| `/keybindings` | Keybinding-feature gated | Creates or opens `~/.claude/keybindings.json`; safe mode delays custom binding activation. |
| `/memory` | Core TUI | Opens a memory file in the configured editor. |
| `/model [name]` | TUI + non-interactive twin | Validates entitlement, policy, account availability, extended context, and explicit IDs before switching. |
| `/pause-memory` (`/memory-pause`, `/toggle-memory`) | **Disabled** (`isEnabled: () => false`) | Dormant session metadata toggle; do not advertise it as available in this build. |
| `/plan [open\|share\|description]` | Core TUI | Enables plan mode or opens/shares the current plan. |
| `/recap` | Feature gated, normally on; non-interactive capable | Runs a one-turn, no-tool fork to generate a one-line session recap. |
| `/release-notes` | Core TUI | Opens the packaged release-note view. |
| `/rename [name]` (`/name`) | TUI + non-interactive twin | Persists an explicit name or generates a short name from conversation context. |
| `/resume [id\|search]` (`/continue`) | Core TUI | Opens or resolves a resumable conversation; see [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md). |
| `/rewind` (`/checkpoint`, `/undo`) | Core local interactive handler | Opens the message selector for code and/or conversation restoration; it is not a separate arbitrary undo engine. |
| `/scroll-speed` | Terminal/renderer gated | Adjusts mouse-wheel scroll speed where the terminal does not use a known native path. |
| `/status` | Core TUI | Shows version, model, account, API connectivity, and tool/integration status. |
| `/tasks` (`/bashes`) | Core TUI | Lists and manages running background tasks. |
| `/theme` | Core TUI | Opens the theme picker, including eligible custom themes. |
| `/tui [default\|fullscreen]` | Core TUI | Chooses the terminal renderer; switching may relaunch and resume the session. |
| `/usage` (`/cost`, `/stats`) | TUI + non-interactive twin | Shows session totals, plan utilization, and local behavior attribution; see [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md). |
| `/wellbeing` (`/breaks`, `/break-reminder`, `/downtime`) | **Disabled** (`isEnabled: () => false`) | Dormant break/quiet-hours settings UI. |
| `/brief` | Feature/account gated | Toggles brief-only output and injects a mode-change reminder into model context. |

### Core configuration, account, and integration commands

| Command (aliases) | State in `2.1.215` | Current role / mechanism owner |
|---|---|---|
| `/advisor [model\|off]` | Model/account gated | Configures the stronger-model advisor surface. |
| `/artifacts` | Artifact-account gated | Browses published/shared artifacts; see [Artifact publishing and live pages](../03-tools-integrations-security/artifact-publishing-and-live-pages.md). |
| `/auto-mode-setup` | Auto-mode feature gated; TUI + non-interactive twin | Guided environment/rule proposal flow with reviewed-file application; see [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md). |
| `/bug [report]` (`/share`) | Core TUI | Opens bug-report/conversation-sharing UI. |
| `/chrome` | Claude.ai/TUI gated | Opens Claude-in-Chrome settings; see [Browser automation and Claude in Chrome](../03-tools-integrations-security/browser-automation-and-claude-in-chrome.md). |
| `/config [key=value ...]` (`/settings`) | TUI + non-interactive twin | Opens settings or validates and applies exposed shorthand keys; see [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md). |
| `/design [subcommand\|prompt]` | First-party auth/policy gated | Bundled hub plus local consent helpers; see [Claude Design and design-system sync](../03-tools-integrations-security/claude-design-and-design-sync.md). |
| `/design-login` | Gated support surface | Acquires design-specific authorization for `/design-sync`. |
| `/design-consent`, `/design-revoke` | Hidden non-interactive helpers | Record or revoke durable `agent_design_projects` access. |
| `/feedback [report]` | Core TUI | Sends feedback or opens the reporting flow; provider availability can narrow it. |
| `/heapdump` | **Hidden diagnostic** | Writes a V8 heap snapshot and a diagnostics JSON file; see [Diagnostics and debug logs](../05-hosted-agent-ops/diagnostics-and-debug-logs.md). |
| `/hooks` | Core TUI | Opens the effective hook-configuration view. |
| `/ide [open]` | Core TUI | Shows and manages IDE integration state. |
| `/import [codex\|gemini]` | Feature gated; TUI + non-interactive twin | Deterministically scans and selectively imports another coding agent's configuration; see [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md). |
| `/init` | Built-in prompt workflow | Creates/improves CLAUDE.md and, on the new flow, can propose skills and hooks. |
| `/install-github-app` | Account/provider gated | Starts Claude GitHub Actions setup. |
| `/install-slack-app` | Claude.ai gated | Opens the Claude Slack Marketplace listing. |
| `/login`, `/logout` | Auth/env gated TUI | Starts account authentication or revokes/clears cached account, design, gateway, and model bootstrap state. |
| `/loops` | **Disabled** (`isEnabled: () => false`) | Dormant TUI loop manager; `/loop` is the active bundled skill. |
| `/mcp [reconnect\|enable\|disable ...]` | TUI + non-interactive twin | Manages live MCP clients; see [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md). |
| `/mobile` (`/ios`, `/android`) | Core TUI | Shows a QR code for the Claude mobile app. |
| `/vim`, `/output-style` | Hidden compatibility shims | Tell the user those settings moved to `/config`; they are not independent configuration flows. |
| `/passes` | Subscriber/referral-cache gated | Opens guest-pass/referral UI only after eligibility has been cached. |
| `/permissions` (`/allowed-tools`) | Core TUI | Manages effective allow/ask/deny rules. |
| `/plugin` (`/plugins`, `/marketplace`) | Core TUI | Manages plugins and marketplaces; see [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md). |
| `/powerup` | Core TUI | Opens interactive product lessons. |
| `/privacy-settings` | Consumer-subscriber gated | Views or updates consumer privacy settings. |
| `/radio` | Feature gated | Opens Claude FM in the browser. |
| `/reload-plugins [--force]` | Core local interactive command | Rebuilds plugin/agent/hook/MCP/LSP runtime state and warns before cache-invalidating MCP changes. |
| `/reload-skills` | Core local; non-interactive capable | Clears command caches and reports added/removed filesystem skills. |
| `/sandbox` | Platform/policy/dependency gated | Configures command sandboxing; see [Sandbox and isolation](../03-tools-integrations-security/sandbox-and-isolation.md). |
| `/setup-bedrock`, `/setup-vertex` | Provider-env gated | Reopens provider authentication, region, and model-pin setup only for the active provider. |
| `/skill-doctor` | Core local; non-interactive capable | Reports unused loaded skills and stale plugins that consume command-list context. |
| `/skills` | Core TUI | Lists available skills. |
| `/statusline` | User-only built-in prompt; interactive only | Launches the status-line setup agent; safe mode refuses because user status lines cannot render there. The later runtime is [a separate JSON/local-command/render loop](../03-tools-integrations-security/status-line.md). |
| `/stickers` | Core local interactive command | Opens the Claude Code sticker page. |
| `/terminal-setup` | Terminal-specific TUI | Installs/checks newline, bell, or clipboard integration for the detected terminal. |
| `/upgrade` | Claude.ai/subscription gated | Opens the eligible plan-upgrade flow. It is distinct from root `claude update`. |
| `/usage-credits` | Account/billing gated; TUI + text twin | Opens billing management or an admin request flow. |
| `/extra-usage` | Hidden rename shim | Reports that the command is now `/usage-credits`, then delegates. |
| `/voice [hold\|tap\|off]` | OAuth, policy, platform, and audio gated | Configures dictation; see [Audio capture and voice](../05-hosted-agent-ops/audio-capture-and-voice.md). |
| `/web-setup` | Claude.ai, remote-policy, and rollout gated | Confirms and imports the local GitHub CLI credential for hosted clone/push access, then bootstraps a default environment when needed; see [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md#interactive-remote-setup-commands). |

### Core agents, automation, remote, and internal commands

| Command (aliases) | State in `2.1.215` | Current role / mechanism owner |
|---|---|---|
| `/agents` | Removed compatibility handler | Explains that the wizard was removed and points to `.claude/agents/` or natural-language creation. |
| `/autofix-pr` | Subscriber/remote-policy gated | Resolves/subscribes an open PR and creates or reuses a long-running cloud repair session; see [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md#autofix-pr-pr-event-monitor-and-repair-session). |
| `/background [prompt]` (`/bg`) | Core TUI; operational fleet/persistence/seed gates | Checkpoints and hands the current conversation to a daemon worker, transfers eligible task/worktree state, and exits the foreground terminal; see [Daemon and background service](daemon-and-background-service.md#background-and-stop). |
| `/stop` | Background-session only | Persists a stopped terminal state and gracefully detaches/exits while retaining transcript/worktree; see [Daemon and background service](daemon-and-background-service.md#background-and-stop). |
| `/daemon` | Daemon-registry gated | Opens local background-service and routine controls. |
| `/desktop` (`/app`) | **Disabled** (`GTy() === false`) | Dormant Desktop handoff surface despite its retained registration. |
| `/fork <directive>` | Agent-fleet/coordinator gated | Depending on the fleet branch, creates a background conversation copy or a full-context background fork; see [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md). |
| `/subtask <task>` | Agent-fleet/coordinator gated | Runs an inherited-context subagent and returns its result to the parent. |
| `/goal [condition\|clear]` | Core TUI + text twin | Installs/inspects/removes the session Stop condition; see [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md#goal-stop-condition-automation). |
| `/insights` | User-only built-in prompt | Generates a local-session usage report; model invocation is disabled. |
| `/pro-trial-expired`, `/rate-limit-options` | Hidden UI entry points | Support account/rate-limit dialogs; not ordinary menu commands. |
| `/remote-control [name]` (`/rc`) | Bridge/auth/policy gated | Starts or disconnects Remote Control; see [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md). |
| `/remote-env` | Subscriber/remote-policy gated | Lists hosted targets, clears a local override, and writes the chosen default environment to user settings; see [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md#interactive-remote-setup-commands). |
| `/review [PR]` | Built-in prompt | Reviews a GitHub PR; working-tree review belongs to `/code-review`. |
| `/security-review` | Built-in prompt fallback | Runs the bundled security-review instructions when the marketplace implementation is unavailable. |
| `/session` (`/remote`) | Remote-session gated; hidden without `fanout` | Read-only display of the cloud session URL and a screen-reader-aware QR code; see [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md#interactive-remote-setup-commands). |
| `/team-onboarding` | Organization-policy gated, user-only prompt | Generates `ONBOARDING.md` from bounded local usage; see [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md). |
| `/teleport` (`/tp`) | Subscriber/remote-policy gated | Imports/resumes a claude.ai session locally; see [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md). |
| `/ultraplan` | Bridge entitlement/feature gated | Launches editable remote planning and polls for approval, remote execution, or teleport-back; see [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md#ultraplan-remote-plan-approval-and-execution-routing). |
| `/ultrareview` | Cloud-review entitlement gated | Starts the hosted review flow; `/code-review ultra` is the newer routed surface. |
| `/update` (`/restart`) | **Hidden and disabled** | Retained relaunch implementation, but `isEnabled: () => false` in this command registry. Root `claude update` remains separate. |
| `/workflows` | Workflow-feature gated | Opens live/completed dynamic workflow runs; see [Dynamic workflows](../06-agents-automation/dynamic-workflows.md). |
| `/__remote-workflow` | **Hidden internal transport command** | Deterministically compiles and runs an environment-delivered workflow only inside a remote CCR session. |

### Bundled skill commands

These names come from `Lu()` rather than `Hur()`. `Lu()` can extract bundled files into a skill root, prepend that base directory to the prompt, attach allowed/disallowed tools and hooks, and preserve user/model invocation boundaries. The generic mechanism is documented in [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md#built-in-and-bundled-command-assembly).

| Command(s) | Availability / caller boundary | Mechanism family |
|---|---|---|
| `/artifact-capabilities`, `/artifact-design`, `/artifact-dashboard`, `/artifact-data-table`, `/artifact-explainer`, `/artifact-report`, `/artifact-pr-review`, `/plan-artifact` | Artifact schema/account gates; user-invocable | Live capability/type references, design guidance, four extracted templates, PR-review template, and plan publishing. See [Artifact publishing and live pages](../03-tools-integrations-security/artifact-publishing-and-live-pages.md). |
| `/dataviz` | User- and model-invocable | Extracts chart guidance plus JS/Python palette validators. |
| `/batch <instruction>` | User-only | Plans 5–30 independent worktree units, then launches background agents that each verify and open a PR. |
| `/claude-in-chrome` | Browser-extension/session gated | Loads browser-tool guidance or a guarded setup/reconnect path before Chrome MCP calls. |
| `/claude-api` | Enabled unless explicitly disabled | Detects project language, extracts matching SDK/API references, and exposes `migrate` / `managed-agents-onboard` prompt branches. |
| `/claude-code-docs [question]` | Rollout gated | Builds a live command/config snapshot and combines it with extracted current-doc references. |
| `/code-review [effort] [--fix] [--comment] [target]` | User-only | Routes by model/effort to inline or workflow-backed review; `ultra` falls back locally when cloud review is unavailable. |
| `/code-walkthrough` | **Disabled** (`isEnabled_10() === false`) | Dormant explainer-Artifact workflow. |
| `/cowork-plugin` | Non-user-invocable; remote Cowork only | Model-only Cowork plugin authoring/customization reference. |
| `/debug [issue]` | User-only | Enables debug logging, flushes it, and injects bounded session/daemon evidence for diagnosis. |
| `/design` | First-party Design gated; user-only | Bundled hub registered before the core helper, so name resolution reaches its subcommand router first. |
| `/design-sync` | Design auth/policy gated; user-only | Extracts converter/validator assets and drives design-system synchronization. |
| `/doctor` (`/checkup`) | User-only; survives bundled-skill kill switch | Runs the repair-capable setup/context/permission audit; root `claude doctor` remains read-only. |
| `/fewer-permission-prompts` | User- and model-invocable | Scans bounded recent transcripts and proposes project permission allows. |
| `/keybindings-help` | Non-user-invocable | Model-only keybinding schema/action/reserved-key reference. |
| `/loop` (`/proactive`) | Local scheduling feature gated | Parses fixed intervals into cron or uses self-paced wakeups; see [Cron and scheduled tasks](../06-agents-automation/cron-and-scheduled-tasks.md). |
| `/memory-types` | Non-user-invocable; automemory gated | Model-only memory taxonomy reference. |
| `/pr-explainer` | **Disabled** (`isEnabled_13() === false`) | Dormant PR walkthrough Artifact workflow. |
| `/run` | User- and model-invocable | Finds a project run skill first, otherwise selects a CLI/server/TUI/Electron/browser/library launch pattern. |
| `/run-skill-generator` | User-only | Requires an actual launch/interaction, then writes a reusable project `run-<unit>` skill and driver. |
| `/schedule` (`/routines`) | First-party subscriber/remote-policy/rollout gated | Creates, updates, lists, or runs cloud-agent routines; see [Cron and scheduled tasks](../06-agents-automation/cron-and-scheduled-tasks.md). |
| `/setup-cowork` | Remote Cowork only | Guided role/plugin/connector/skill/writing-voice onboarding. |
| `/simplify [target]` | User- and model-invocable | Runs four cleanup angles (parallel when agent tools exist) and applies behavior-preserving fixes. |
| `/update-config` | User- and model-invocable | Injects the current settings schema and a verified hook-construction flow. |
| `/verify [target]` | User-only | Drives the real runtime surface and captures evidence; it explicitly distinguishes verification from tests/typecheck. |

### Non-advertised command-shaped definitions

`INTERNAL_ONLY_COMMANDS` also retains command objects that are deliberately outside `Hur()`. The notable real names are `/commit-push-pr` (an internal prompt with narrowly pre-authorized Git/`gh` patterns) and `/version` (both TUI and text registrations have `isEnabled: () => false`). They are implementation support objects, not ordinary shipped slash commands. Stub objects and optional null feature arms are likewise excluded from the catalog above.

## Aliases and spelling variants

| Alias or variant | Canonical surface |
|---|---|
| root `claude upgrade` | root `claude update` |
| root `claude rc` | root `claude remote-control` |
| interactive `/rc` | interactive `/remote-control` |
| `--rc [name]` | `--remote-control [name]` |
| `--allowed-tools` | `--allowedTools` |
| `--disallowed-tools` | `--disallowedTools` |

Interactive `/upgrade` is **not** an alias for `/update`: it is the gated subscription-upgrade UI. The disabled interactive `/update` object is a separate relaunch implementation. The alias above applies only to the Commander root command family.

`--permission-mode manual` is accepted as the user-facing spelling of the historical `default` mode; `2.1.215 --help` lists `manual` and the settings schema continues to accept `default`.

## Parse-time optimization

`CommanderRoot` has a fast path for `-p`/`--print`: when print mode is selected and no `cc://` or `cc+unix://` URI argument is present, the root options can be parsed before the heavier subcommand tree is registered. This keeps common headless runs lighter.

## Related docs

- [CLI main paths](cli-main-paths.md)
- [Accessibility and screen-reader mode](accessibility-and-screen-reader-mode.md)
- [Safe mode and recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)
