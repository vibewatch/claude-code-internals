# Glossary and aliases

This page defines recurring semantic aliases, minified-symbol search handles, and terminology used across the Claude Code internals wiki.

## Scope and caveats

- Semantic aliases are wiki terms, not upstream/public API names.
- Minified symbols are build-specific search handles for the analyzed `cli.renamed.js` artifact.
- Prefer semantic aliases in prose and preserve exact strings/symbols in source-anchor tables.
- Use alias-first source-anchor tables: `Semantic alias`, `Source`, `Approximate location`, exact string/symbol, and meaning.

## High-value semantic aliases

| Semantic alias | Minified symbol or string | Meaning |
| --- | --- | --- |
| Outer bootstrap | `J9A` | Late bootstrap/version/update entry path before main runtime dispatch. |
| Top-level main | `O4A` | Environment initialization and deep-link/top-level startup path. |
| Commander root | `w4A` | Root `claude` command construction and mode routing. |
| Headless runner | `runHeadless`, `runHeadlessStreamingForTesting` | Print/SDK stream loop and headless framing. |
| Interactive session loop | `pT$`, `aa4` | TUI session loop and interactive picker/session paths. |
| Session discovery | `loadConversationForResume` | Finds latest/explicit/search-selected session records. |
| Session restore | `OG8` | Rehydrates a transcript into the live session envelope. |
| Tool execution boundary | `U85` | Permission, hook, denial/allow telemetry, and tool execution mediator. |
| MCP command registrar | `rR4` | Registers the `mcp` command family. |
| MCP runtime coordinator | `fH9` | Connects regular, always-load, and claude.ai connector MCP configs. |
| Plugin command registrar | `fC4` | Registers `plugin` / `plugins` command families. |
| Remote bridge process | `bridgeMain` | Bridge process entry family. |
| Remote Control bridge | `initReplBridge` | Interactive Remote Control bridge initializer. |
| System frame emitter | `session_state_changed`, `control_request`, related strings | SDK/headless/session frame family. |
| Prompt dynamic boundary | `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | Split between stable and dynamic system-prompt sections. |

## Common tool aliases

| Semantic name | Source-visible tool name | Meaning |
|---|---|---|
| Shell command tool | `Bash` | Shell/process execution. |
| File read tool | `Read` | File content reads. |
| File pattern tool | `Glob` | Glob-style file discovery. |
| Content search tool | `Grep` | Content search. |
| File edit tool | `Edit` | Single-file edit operation. |
| File write tool | `Write` | File write operation. |
| URL fetch tool | `WebFetch` | Fetch URL/domain content. |
| Web search tool | `WebSearch` | Search web content through provider/runtime support. |
| Todo tool | `TodoWrite` | Plan/todo state tracking. |
| Skill tool | `Skill` | Runtime skill loading. |
| Task tools | `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `SendMessage` | Subagent/task dispatch and state. |

## Terminology

| Term | Definition |
|---|---|
| Source anchor | A file path plus approximate line/byte offset and exact string/symbol used to find behavior in the analyzed bundle. |
| Semantic alias | A stable wiki label for a minified or cross-cutting runtime concept. |
| Minified anchor | A build-specific function, variable, or string handle used only for source lookup. |
| Live envelope | In-memory session state: model, cwd, tools, hooks, permissions, transcript state, tasks, and bridge state. |
| Local JSONL transcript | Append-only session file used for resume, continue, fork, rewind, and mirroring. |
| Sidechain transcript | Separate transcript for a delegated task/subagent, linked back to the parent session. |
| Hook | In-process lifecycle extension point such as `PreToolUse` or `SessionEnd`. |
| Frame | Serialized headless/SDK/remote message such as `session_state_changed` or `control_request`. |
| Protocol method | JSON-RPC or HTTP method/path such as MCP `tools/list` or provider `/v1/messages`. |
| Permission mode | Runtime setting/flag that controls tool approval behavior. |
| Execution boundary | The point where visibility, allow/deny rules, hooks, host approval, and tool-specific guards converge before a tool runs. |
| Context compaction | Summarizing/replacing prior conversation context to stay within token budgets. |
| Remote Control | Bridge/control projection over a local session, surfaced by `remote-control`, `--remote-control`, and `--rc`. |
| Teleport | Remote/session resume path with repository/session consistency guardrails. |
| GrowthBook gate | Feature-evaluation path whose `tengu_*` strings often indicate staged rollout or telemetry surfaces. |

## Abbreviations

| Abbreviation | Meaning |
|---|---|
| CLI | Command-line interface. |
| TUI | Terminal user interface. |
| SDK | Software development kit / external host integration surface. |
| SSE | Server-Sent Events. |
| JSONL | JSON Lines. |
| MCP | Model Context Protocol. |
| LSP | Language Server Protocol. |
| JSC | JavaScriptCore. |
| OTEL | OpenTelemetry. |
| CWD | Current working directory. |
| FD | File descriptor. |
| UUID | Universally unique identifier. |

## Related docs

- [`cli.renamed.js` overview](what-is-cli-js.md)
- [Main feature map](main-feature-map.md)
- [Runtime communication protocols](runtime-communication-protocols.md)
- [Command-line reference](../01-runtime-lifecycle/command-line-reference.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Data models and frame schemas](../04-sessions-persistence-remote/data-models-and-frame-schemas.md)