# Commands and flags

This page reverse-engineers the user-facing command surface built by `CommanderRoot`, the Commander root setup function in the analyzed `cli.renamed.js`.

Use [Command-line reference](command-line-reference.md) for the canonical table of flags, subcommands, aliases, and mode surfaces. This page remains the narrative explanation of how those surfaces route runtime behavior.

## Source anchors

| Semantic alias | Anchor | Meaning |
| --- | --- | --- |
| CommanderRoot | `Claude Code - starts an interactive session by default` | Commander root construction and mode routing. |
| ClaudeRootCommand | `Usage: claude [options] [command] [prompt]` | Root command name and invocation shape. |
| PrintModeFlag | `-p, --print` | Selects non-interactive print/headless mode. |
| ToolAllowListFlag | `--allowedTools, --allowed-tools <tools...>` | Tool allow-list flag. |
| PermissionModeFlag | `--permission-mode <mode>` | Session permission mode selector. |
| ContinueSessionFlag | `-c, --continue` | Continue the most recent conversation in the current directory. |
| ResumeSessionFlag | `-r, --resume [value]` | Resume by session ID or open picker/search. |
| AuthCommandFamily | `H.command("auth")` | Authentication command family. |
| McpCommandRegistrar | `mcp — Configure and manage MCP servers` | `mcp` command-family registrar. |
| PluginCommandRegistrar | `plugin|plugins — Manage Claude Code plugins` | `plugin`/`plugins` command-family registrar. |
| SafeModeFlag | `--safe-mode`, `CLAUDE_CODE_SAFE_MODE` | Starts without customizations while retaining policy, auth, core tools, and permissions. |
| ScreenReaderFlag | `--ax-screen-reader`, `CLAUDE_AX_SCREEN_READER` | Selects flat text without decorative borders or animations. |

## Bundle module in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `PluginCommandHandlers` | approximately 657701 | `pluginInstallHandler`, `pluginUninstallHandler`, `pluginListHandler`, `pluginInitHandler`, `pluginTagHandler`, `pluginPruneHandler`, `pluginValidateHandler`, `pluginUpdateHandler` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |

## Root command

The root command is named `claude` and describes itself as an interactive session by default, with `-p`/`--print` for non-interactive output. Its root action is the main decision point for:

- headless/print versus interactive TUI;
- JSON/text/stream output validation;
- prompt/stdin ingestion;
- session resume/continue/remote selection;
- settings, MCP, plugins, tools, and agents loaded for the selected mode.

## Root flag families

| Family | Representative flags | Runtime implication |
|---|---|---|
| Diagnostics/recovery | `--debug`, `--debug-file`, `--verbose`, `--safe-mode` | Enables debug logging, specific log files, verbose output, or customization-free recovery startup. |
| Headless/SDK output | `-p`, `--print`, `--output-format`, `--input-format`, `--json-schema`, `--include-partial-messages`, `--include-hook-events`, `--replay-user-messages`, `--forward-subagent-text`, `--prompt-suggestions` | Selects the scriptable print/SDK path and result framing. The final two require `stream-json`. |
| Thinking/budget | `--thinking`, `--thinking-display`, `--max-thinking-tokens`, `--max-turns`, `--max-budget-usd`, `--task-budget` | Controls thinking mode, turn limits, and spending/token budget constraints. |
| Tools/permissions | `--tools`, `--allowedTools`, `--disallowedTools`, `--permission-mode`, `--permission-prompt-tool`, `--dangerously-skip-permissions` | Shapes model-visible tools and approval behavior. |
| Prompt/context | `--system-prompt`, `--system-prompt-file`, `--append-system-prompt`, `--append-system-prompt-file`, `--add-dir`, `--exclude-dynamic-system-prompt-sections`, `--plan-mode-instructions` | Overrides or extends system prompts and workspace context. |
| Sessions | `--continue`, `--resume`, `--fork-session`, `--no-session-persistence`, `--resume-session-at`, `--rewind-files`, `--session-id`, `--name` | Controls local transcript restore, session IDs, fork/rewind, and persistence. |
| Models/auth | `--model`, `--fallback-model`, `--betas` | Selects model aliases, fallback model behavior, and beta headers. |
| Settings/integrations | `--settings`, `--setting-sources`, `--mcp-config`, `--strict-mcp-config`, `--plugin-dir`, `--plugin-url`, `--agents`, `--ide`, `--chrome`, `--file` | Adds runtime settings, MCP/plugin/agent definitions, IDE/browser/file integrations. |
| Accessibility | `--ax-screen-reader` | Forces screen-reader-friendly flat text; env and settings can select the same renderer. |
| Remote hidden paths | `--teleport`, `--remote`, `--remote-control`, `--rc`, `--remote-control-session-name-prefix`, `--prefill`, `--deep-link-origin` | Used by remote sessions, teleport, Remote Control, and deep-link launch flows. |

## Main command families

| Command | Anchor | Runtime role |
|---|---|---|
| `mcp` | `McpCommandRegistrar` | Manages MCP servers and starts the Claude Code MCP server. |
| `plugin` / `plugins` | `PluginCommandRegistrar` | Manages plugins, marketplaces, local/session plugins, and plugin capabilities. |
| `auth` | `H.command("auth")` | `login`, `status`, and `logout` subcommands for authentication. |
| `project purge [path]` | `H.command("project")` | Deletes project-scoped Claude Code state. |
| `setup-token` | `H.command("setup-token")` | Sets up long-lived authentication token flow. |
| `agents` | `H.command("agents")` | Opens/manages background agents and dispatched sessions. |
| `ultrareview [target]` | `H.command("ultrareview [target]")` | Runs cloud-hosted multi-agent code review. |
| `auto-mode` | `config`, `defaults`, `critique`, `reset` | Prints effective/default classifier policy, critiques custom rules, or removes user overrides. |
| `remote-control` / `rc` | `H.command("remote-control", {hidden: true}).alias("rc")` | Starts local-session Remote Control bridge. |
| `doctor` | `H.command("doctor")` | Checks auto-updater and related health state. |
| `update` / `upgrade` | `H.command("update").alias("upgrade")` | Checks for and installs updates. |
| `install [target]` | `H.command("install [target]")` | Installs a stable/latest/specific native build. |

The plugin command handlers additionally confirm `init`, `list`, `prune`, and `tag` alongside install/update/uninstall/validate. `--plugin-url` downloads a session-only `.zip`; unlike a marketplace install, it is not a durable plugin registration.

## Parse-time optimization

`CommanderRoot` has a fast path for `-p`/`--print`: when the process is in print mode and no `cc://` or `cc+unix://` URI argument is present, it parses after root options are built and returns before registering heavier subcommands. This keeps common headless runs lighter.

## Related docs

- [Command-line reference](command-line-reference.md)
- [CLI main paths](cli-main-paths.md)
- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Built-in tools and permissions](../03-tools-integrations-security/built-in-tools-and-permissions.md)
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md)
