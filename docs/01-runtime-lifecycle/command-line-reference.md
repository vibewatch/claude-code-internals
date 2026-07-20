# Command-line reference

This page is the table-first companion to [Commands and flags](commands-and-flags.md). It centralizes the source-visible root flags, command families, aliases, and mode-specific CLI surfaces so narrative pages can link here instead of repeating long option lists.

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
| Accessibility | `--ax-screen-reader` | [Accessibility and screen-reader mode](accessibility-and-screen-reader-mode.md) |
| Remote and deep links | `--remote`, `--teleport`, `--remote-control`, `--rc`, `--remote-control-session-name-prefix`, `--prefill`, `--deep-link-origin` | [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) |

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

### Interactive command additions

| Command | Current behavior |
|---|---|
| `/cd <path>` | Changes the live session working directory and can emit `CwdChanged`. |
| `/config key=value [key=value ...]` | Applies one or more settings directly; bare `/config` opens the settings UI. |
| `/fork <directive>` | Copies the current conversation into a separately listed background session. |
| `/subtask <task>` | Runs the former in-session `/fork` delegation behavior as a subagent. |
| `/workflows` | Opens live/history views for dynamic workflow runs and supports stopping active runs. |
| `/doctor` (`/checkup`) | Runs the interactive setup checkup, including fix suggestions. |

## Aliases and spelling variants

| Alias or variant | Canonical surface |
|---|---|
| `upgrade` | `update` |
| `rc` | `remote-control` |
| `--rc [name]` | `--remote-control [name]` |
| `--allowed-tools` | `--allowedTools` |
| `--disallowed-tools` | `--disallowedTools` |

`--permission-mode manual` is accepted as the user-facing spelling of the historical `default` mode; `2.1.215 --help` lists `manual` and the settings schema continues to accept `default`.

## Parse-time optimization

`CommanderRoot` has a fast path for `-p`/`--print`: when print mode is selected and no `cc://` or `cc+unix://` URI argument is present, the root options can be parsed before the heavier subcommand tree is registered. This keeps common headless runs lighter.

## Related docs

- [Commands and flags](commands-and-flags.md)
- [CLI main paths](cli-main-paths.md)
- [Accessibility and screen-reader mode](accessibility-and-screen-reader-mode.md)
- [Safe mode and recovery](../05-hosted-agent-ops/safe-mode-and-recovery.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md)