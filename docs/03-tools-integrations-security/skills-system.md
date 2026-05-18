# Skills system

The Skills system is the runtime that turns a markdown file + frontmatter into a model-invokable tool. Built-in Claude Code skills (`claude-api`), user skills (`.claude/skills/`), plugin-provided skills, and the SDK-registered skills all flow through the same `parseSkillFrontmatterFields → createSkillCommand → processSkillMarkdown → getPromptForCommand` pipeline.

Use this page alongside:

- [MCP, plugins, and hooks](mcp-plugins-hooks.md) for how plugins contribute skills.
- [Prompt template catalog](../02-context-model-loop/prompt-template-catalog.md) for the static skill description prompts.
- [Built-in tools and permissions](built-in-tools-and-permissions.md) for the `Skill` built-in tool and the `allowedTools` rule format.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| SkillFrontmatterParser | `parseSkillFrontmatterFields(frontmatter, baseDir, name, kind="Skill")` | Parses a SKILL.md / command frontmatter block into a typed descriptor. |
| SkillCommandFactory | `createSkillCommand({skillName, displayName, description, markdownContent, allowedTools, argumentHint, argumentNames, whenToUse, version, model, disableModelInvocation, userInvocable, hooks, executionContext, agent, paths, effort, shell, createdBy, declaredFields, fallback, ...})` | Builds the in-memory command record returned to the runtime. |
| SkillMarkdownProcessor | `function processSkillMarkdown(markdown, vars)` | Strips HTML comments and substitutes `{{var}}` placeholders. |
| SkillBudgetFormatter | `function formatCommandsWithinBudget(commands, sessionContext, weighter, options)` | Tail-truncates skill descriptions to fit a token budget. |
| SkillToolInfo | `getSkillToolInfo(state)`, `getSkillInfo(state)`, `getLimitedSkillToolCommands(state)` | Surface for the `Skill` tool to ask "what skills are available and which apply?". |
| ClaudeApiSkillRegistrar | `function registerClaudeApiSkill()` | Registers the built-in `claude-api` skill that ships with the bundle. |
| SkillSubcommandMatcher | `function matchSubcommand(input)` | Resolves the first whitespace-delimited token against the skill's declared subcommands. |
| SkillStateRestorer | `function restoreSkillStateFromMessages(messages)` | Restores live skill state from a resumed transcript so a session reload knows which skills already ran. |
| SlashCommandDispatcher | `function processSlashCommand(input, ...)`, `function processPromptSlashCommand(input, ...)`, `function looksLikeCommand(text)` | Slash-command parser/dispatcher that resolves `/skillname args` into a skill invocation. |
| SkillLoadingMetadata | `function formatSkillLoadingMetadata(skill, phase="loading")` | Renders the user-facing skill-loading banner. |
| UserPromptExpansionRunner | `async function runUserPromptExpansionHook(...)` | Runs the `UserPromptExpansion` hook chain after slash-command resolution. |
| PromptCache | `function clearPromptCache()` | Clears the cached SDK skill prompt (re-fetched lazily by `getPrompt`). |
| CommandBudgetConstants | `const ww6 = 20` (minimum-per-skill chars), `const Yz_ = 200000` (default token budget) | Budget thresholds used by `formatCommandsWithinBudget`. |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line(s) | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `SkillsRuntime` | 278242, 487278, 718869, 424568, 400592 | `parseSkillFrontmatterFields`, `createSkillCommand`, `processSkillMarkdown`, `formatCommandsWithinBudget`, `getSkillToolInfo`, `getSkillInfo`, `getLimitedSkillToolCommands`, `registerClaudeApiSkill`, `matchSubcommand`, `restoreSkillStateFromMessages`, `processSlashCommand`, `processPromptSlashCommand`, `looksLikeCommand`, `runUserPromptExpansionHook`, `formatSkillLoadingMetadata`, `clearPromptCache`, `CLAUDE_API_SKILL_DESCRIPTION` | [Bundle module map — integrations (MCP, plugins, MCPB, LSP)](../99-research-atlas/module-map-from-renamed-cli.md#integrations-mcp-plugins-mcpb-lsp) |

## Skill lifecycle

```mermaid
flowchart TD
    Discovery[Disk scan / SDK register / plugin load] --> Frontmatter[parseSkillFrontmatterFields]
    Frontmatter --> Validate{required fields ok?}
    Validate -->|no| Skip[skip with debug warning]
    Validate -->|yes| Build[createSkillCommand]
    Build --> Registry[in-memory command registry]
    Registry --> ToolInfo[Skill tool surfaces: name + description]
    ToolInfo --> Budget[formatCommandsWithinBudget tail-truncates]
    Budget --> Prompt[System prompt receives the command list]
    Prompt --> User{model invokes Skill}
    User --> Resolve[matchSubcommand resolves /name → skill]
    Resolve --> Hook[runUserPromptExpansionHook can mutate input]
    Hook --> Run[skill.getPromptForCommand expands markdown]
    Run --> Substitute[processSkillMarkdown applies {{var}}]
    Substitute --> Send[expanded prompt sent to model loop]
```

## Frontmatter contract

`parseSkillFrontmatterFields` reads a YAML frontmatter object and returns a typed descriptor. The relevant fields:

| Field | Effect |
|---|---|
| `name` | Displayed name (defaults to the file/directory slug). |
| `description` | Description shown to the model. Validated through `bE(...)`; falls back to `cHH(baseDir, kind)` (`"Skill"` or `"Prompt"`). |
| `user-invocable` | Boolean — when false the skill is hidden from `/help` and slash autocomplete (set via `jBH(...)`). |
| `model` | Optional override resolved through `parseUserSpecifiedModel(...)`. `"inherit"` means "use main-loop model" (returns undefined). |
| `effort` | Reasoning-effort override; parsed via `JC(value)`; invalid values are logged and ignored. |
| `allowed-tools` | List of tools the skill may run; passed through `at(...)`. Inside the skill body, `${CLAUDE_SKILL_DIR}` placeholders are substituted with the skill's base directory before the list is enforced. |
| `argument-hint` | Free-text hint shown in the slash command line. |
| `arguments` | Named arguments; parsed via `O$8(...)`. |
| `when_to_use` | Optional hint shown to the model. |
| `version` | Skill version string. |
| `disable-model-invocation` | When true the skill is not exposed to the model at all (only invoked by user). |
| `hooks` | Per-skill hook map (parsed via `Y15(...)`). Skills can register their own SessionStart/PreToolUse/etc. hooks. |
| `context: "fork"` | Skills that need a forked subagent context (the only allowed value). |
| `agent` | Pin invocation to a specific agent (e.g. a subagent template). |
| `shell` | Shell override for slash-style skills (parsed via `Yr$(...)`). |
| `created_by` / `improved_by` | When equal to `"dream-proposal"`, attribution is preserved. |
| `paths` | Restrict the skill to specific path globs. |
| `fallback` | Hook-style fallback resolution (`GZH(...)`). |

`parseSkillFrontmatterFields` also captures `declaredFields` (the set of frontmatter keys actually present) via `zr$(...)`, so later layers can warn on unknown fields without losing the original keys.

## Tool-name allowlist substitution

`createSkillCommand` rewrites every `${CLAUDE_SKILL_DIR}` placeholder in `allowedTools` to the skill's base directory **before** building the command record. The same substitution happens to the markdown body inside `getPromptForCommand`. This is why a skill can ship `allowedTools: ["Read(${CLAUDE_SKILL_DIR}/data/*)"]` and have it scoped correctly per install location.

`${CLAUDE_SESSION_ID}` is also substituted in the body (using `getSessionId()`), and `${CLAUDE_EFFORT}` is substituted using the skill's `effort` value or the calling session's `getEffortValue()`.

## Command record shape (`createSkillCommand`)

The returned record matches the in-memory slash-command interface and carries:

- `type: "prompt"`
- `name`, `description`, `argumentHint`, `argNames`, `whenToUse`, `version`, `model`, `disableModelInvocation`, `userInvocable`
- `context` (only set when `"fork"`)
- `agent`, `effort`, `paths`, `declaredFields`, `contentLength` (markdown length)
- `isHidden = !userInvocable`
- `progressMessage = "running"`
- `userFacingName()` — returns `displayName || name`
- `source`, `loadedFrom` — provenance (settings / plugin / skill root / mcp / etc.)
- `createdBy`, `fallback`
- `hooks` — per-skill hook overrides
- `skillRoot` — directory used for relative path resolution
- `getPromptForCommand(argv, sessionContext)` — async function that expands the markdown body, substitutes variables, applies the per-skill `allowedTools` scope to the session, and returns `[{type: "text", text: ...}]`

### `getPromptForCommand` expansion order

1. If `skillRoot` is set, the body is prefixed with `Base directory for this skill: <root>`.
2. `BFH(...)` injects positional/named arguments according to `argNames`.
3. `${CLAUDE_SKILL_DIR}` is substituted (only when `skillRoot` is set).
4. `${CLAUDE_SESSION_ID}` is substituted with the current session id.
5. `${CLAUDE_EFFORT}` is substituted with `aT(model, effort)`.
6. If the load source is "mcp"-like (`A15(...)`) and `EM8()` returns true, the body is rewritten through `yM8(...)` (MCP elicitation flavor).
7. Otherwise `dHH(...)` runs general prompt expansion using a temporary `toolPermissionContext` whose `alwaysAllowRules.command` is merged with the skill's `allowedTools` — the skill gets to run its declared tools without escalating permission for the rest of the session.

## Markdown processing helpers

`processSkillMarkdown(markdown, vars)` does two passes:

1. Strip all `<!--...-->` HTML comments (looping until no change) so users can leave triage notes in the SKILL.md without leaking them into the prompt.
2. Substitute every `{{var}}` placeholder using the supplied `vars` map.

The `Ce4`/`Se4`/`wKA` helpers in the `claude-api` skill use this to materialize per-language documentation blocks. `Se4(paths, files, vars)` builds `<doc path="...">...</doc>` envelopes; `wKA` assembles the reading-guide-aware prompt for the detected project language.

## Built-in `claude-api` skill

`registerClaudeApiSkill()` is the single registration call for Claude Code's built-in API-help skill. It:

- Registers a skill named `"claude-api"` with `allowedTools: ["Read", "Grep", "Glob", "WebFetch"]` and `userInvocable: true`.
- Declares `files: zKA()` — the embedded markdown files keyed by language and topic.
- Defines `getPromptForCommand(argv)`:
  1. Calls `fKA()` to detect the project's primary language by inspecting common files (`requirements.txt`/`pyproject.toml` → python, `tsconfig.json`/`package.json` → typescript, `pom.xml` → java, `go.mod` → go, `Gemfile` → ruby, `*.cs`/`.csproj` → csharp, `composer.json` → php, fallback `curl`).
  2. Emits `tengu_claude_api_skill_loaded` telemetry with the detected language, the subcommand resolved by `matchSubcommand`, and whether the user supplied arguments.
  3. Returns the assembled prompt from `wKA(detectedLang, argv, vars)` which includes a reading guide ("how to map a task to a doc file") plus the language-specific documentation blocks and any user request text.

`matchSubcommand(text)` allows the user to type `/claude-api migrate` or `/claude-api managed-agents-onboard`; anything else resolves to `"none"`.

The skill's hard-coded description (`CLAUDE_API_SKILL_DESCRIPTION`) embeds an explicit trigger list ("when: code imports `anthropic`/`@anthropic-ai/sdk`; user asks for the Claude API…") and a skip list ("`openai`/other-provider SDK, provider-neutral code") so the model invokes it only when it actually fits.

## Budget-aware presentation

`formatCommandsWithinBudget(commands, sessionContext, weighter, options)` is the function that decides which skill descriptions get fully shown to the model:

1. Each command becomes `{cmd, full}` where `full` is either `- name: <description>` or `- name` for name-only commands.
2. If the total bytes fit the budget, every full description is emitted.
3. Otherwise, bundled prompts and name-only commands are always kept; everything else is recomputed with a per-skill char allowance.
4. When the caller supplies a `weighter(command)` (used to express "this skill is more relevant to the current turn"), high-weight commands get to keep their full description; low-weight ones drop to name-only.
5. Names always survive — descriptions are the variable. The minimum per-skill description allowance is `ww6 = 20` chars; below that the function falls back to name-only for all variable rows.
6. When per-skill truncation kicks in, descriptions are truncated to the allowance with an ellipsis.

This is what the `Skill` tool calls to keep the system-prompt skill list under budget without dropping skills entirely.

## Slash-command dispatch

`looksLikeCommand(text)` is the cheap predicate the input pipeline uses to short-circuit non-command input. `processSlashCommand(...)` walks the input, resolves it against the live command registry, runs `runUserPromptExpansionHook(...)` to let hooks rewrite the input, and ultimately calls the resolved command's `getPromptForCommand(...)`. `processPromptSlashCommand(...)` is the variant invoked when a slash command is found embedded inside a longer prompt (the user typed "do X and then /lint").

## Session restore

`restoreSkillStateFromMessages(messages)` walks a resumed transcript and re-derives which skills already loaded their content in the live state. This is how `/resume` brings back a session that previously loaded a skill — the skill's `<skill-loaded>` tag in the transcript signals "already loaded" so the runtime doesn't re-load it on resume.

## Related docs

- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [Prompt template catalog](../02-context-model-loop/prompt-template-catalog.md)
- [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md)
- [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md)
