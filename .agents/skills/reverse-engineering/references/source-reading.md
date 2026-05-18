# Source Reading and Anchor Handling

Use this reference for precise searches, source anchors, semantic aliasing, and compiled/minified artifact interpretation.

## Source Material Trust Model

Use source layers according to their evidentiary role:

| Source | Role | Trust model |
|---|---|---|
| `claude-code-pkg/metadata.json` | Extraction metadata, package versions, target platform, binary hash, optional `.bun` section hash. | Highest value for artifact identity and package-version deltas. |
| `claude-code-pkg/wrapper/package.json` | Wrapper package identity, bin entry, optional native dependencies, SDK declaration file list. | Confirms npm distribution shape and target native package names. |
| `claude-code-pkg/wrapper/install.cjs` and `cli-wrapper.cjs` | Wrapper install and fallback launch logic. | Strong evidence for package selection, platform detection, and native binary handoff. |
| `claude-code-pkg/wrapper/sdk-tools.d.ts` | SDK/tool declarations and type surfaces. | Confirms external API contracts; does not prove runtime lifecycle by itself. |
| `claude-code-pkg/native/claude` or `claude-code-pkg/native/claude.exe` | Main native runtime artifact. | Highest value for exact embedded strings and binary identity, but current Bun builds are not readable JS source. |
| `claude-code-pkg/sections/claude.bun` | Dump of the ELF `.bun` payload section when present. | Useful for lower-noise string-surface scanning; still not a source map. |
| Captured `claude --help` output | User-facing commands, flags, and wording. | Confirms visible CLI/TUI surfaces, not hidden implementation paths. |
| `source-atlas/` | Generated string/symbol index. | Triage layer only; atlas hits are leads, not proof. |
| `docs/` | Current internals wiki. | Starting point for gap analysis, duplication checks, and reader-boundary decisions. |

Runtime source or observed behavior beats schema-only conclusions. For compiled Bun artifacts, avoid claiming a lifecycle solely from one string hit; require multiple adjacent anchors, wrapper/help corroboration, SDK declarations, or a safe observable command result.

## Build a Narrow Anchor Plan

Prefer specific terms that should co-occur in the target path:

- Semantic subsystem words such as `mcpServers`, `tools/list`, `Bash`, `TodoWrite`, `CLAUDE.md`, `settings.local.json`, `PreToolUse`, `ANTHROPIC_API_KEY`, or `/permissions`.
- Generated API names from SDK declaration files.
- Exact strings from existing docs or previous source reads.
- Event-like names, protocol methods, slash commands, flags, environment variables, and feature/config keys.
- Adjacent concepts that should appear in the same call path.

In incremental mode, seed the plan from `source-atlas/` diffs first: changed env vars, model/provider strings, command candidates, MCP methods, tool hits, config paths, package support files, and moved semantic anchors.

Effective discovery patterns include:

- Constants-first discovery for env vars, provider selection, feature toggles, and operation modes.
- Protocol-method tracing for MCP tools/resources/prompts, JSON-RPC boundaries, and IDE/LSP bridges.
- Command and flag tracing for TUI, print mode, model selection, permissions, memory, settings, and resume.
- Adjacent-file confirmation with wrapper files, SDK declarations, package metadata, and help output.

## Search Practices

- Use alternation-style searches to collect a map of likely anchors in one pass.
- Avoid vague searches such as `run`, `tool`, `session`, or `agent` unless paired with exact strings, flags, API names, or config paths.
- Prefer focused reads around likely anchors over repeated full-artifact scans.
- Keep exact string literals and byte offsets intact in notes.

## Reading Source Ranges

For each promising anchor:

1. Read enough surrounding artifact context to identify the wrapper function, SDK declaration, help section, package metadata boundary, or adjacent string cluster.
2. Record the approximate line range or byte offset and exact string/symbol.
3. Assign a stable semantic alias, such as `native package selector`, `MCP protocol surface`, `permission command`, or `project memory loader`.
4. Follow the path outward through setup, entry points, runtime branching, configuration, visible commands, files, protocol methods, and cleanup where the artifacts allow it.
5. Triangulate with adjacent packaged files or safe command output when binary strings are ambiguous.

## Anchor Format

Use a compact source-anchor table in docs and final reports.

| File | Approximate location | Symbol or string | Semantic meaning |
|---|---:|---|---|
| `claude-code-pkg/native/claude` | `0x1234abcd` | `ANTHROPIC_API_KEY` | Provider credential surface present in the runtime artifact |
| `claude-code-pkg/wrapper/install.cjs` | `~60-120` | `PLATFORMS` | Native package selection table |

## Interpretation Rules

- Approximate line numbers and byte offsets are enough because bundled/native output shifts between versions.
- Wrapper source proves wrapper behavior; SDK declarations prove contracts; help output proves user-facing wording; binary strings prove embedded surface presence.
- Generated SDK declarations describe contracts; they do not prove lifecycle, enforcement, or cleanup.
- Changed strings or symbol counts are leads, not proof of changed behavior.
- When confidence is low, record a candidate gap instead of writing authoritative prose.

## Pitfalls

- Broad binary grep creates noise and wastes context.
- Printable-string diffs are often noisy; prioritize high-signal env vars, flags, commands, protocol methods, tools, config paths, and package metadata.
- Do not infer product intent from compiled artifacts unless behavior is directly observable or corroborated.
- Do not treat random slash-like URL/API/path fragments as confirmed slash commands.