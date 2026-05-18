# Full Analysis Mode

Use full analysis for broad or first-time reconstruction of a Claude Code runtime subsystem. This mode reads extracted package metadata, wrapper files, SDK declarations, help text, and binary/string surfaces directly. `source-atlas/` is only a discovery aid unless the input is a readable text file.

## Typical Targets

- Package layout, npm wrapper behavior, platform-native package selection, and Bun runtime startup.
- CLI argument parsing, interactive TUI routing, print/headless modes, resume/continue, and output formats.
- Authentication, OAuth/token storage, API-key sources, provider routing, Bedrock/Vertex/custom endpoints, and model selection.
- Prompt/context assembly, `CLAUDE.md`, `.claude/` settings, memory, output styles, and workspace context.
- Tool registration, filtering, permissions, approval prompts, sandbox boundaries, and shell execution.
- MCP configuration, transport lifecycle, protocol methods, tools/resources/prompts, and timeout policy.
- Hooks, agents, tasks, background work, custom agents/skills, and automation entry points.
- Sessions, transcripts, resume/fork/rewind behavior, local state files, and export.
- Observability, updates, diagnostics, telemetry, crash/debug logs, and shutdown.

## Procedure

1. Define the target subsystem and expected user-visible behavior.
2. Audit existing docs before touching generated atlas or binary surfaces; classify the topic as already covered, partially covered, schema-only, or missing.
3. If `claude-code-pkg/metadata.json` is missing, extract the current package with `node scripts/extract-claude-code-pkg.mjs`.
4. If `source-atlas/summary.json` is missing or stale for the extracted artifact, regenerate with `node scripts/index-claude-code.mjs`.
5. Build a narrow anchor plan from semantic subsystem words, exact strings, flags, env vars, slash commands, MCP methods, known tool names, file paths, and atlas surfaces.
6. Read focused artifacts until the behavior is confirmed as far as available sources allow:
   - `claude-code-pkg/metadata.json`
   - `claude-code-pkg/wrapper/package.json`
   - `claude-code-pkg/wrapper/install.cjs`
   - `claude-code-pkg/wrapper/cli-wrapper.cjs`
   - `claude-code-pkg/wrapper/sdk-tools.d.ts`
   - `claude-code-pkg/native/claude` or `claude-code-pkg/native/claude.exe` via generated atlas offsets/strings
   - `claude-code-pkg/sections/claude.bun` when available
   - captured `claude --help` or command-specific help output when safe and useful
7. Reconstruct a concise runtime map with entry point, branch conditions, downstream surfaces, user-visible events/strings, files touched, configuration boundaries, errors, cleanup, and caveats.
8. Decide whether to patch an existing page, create a focused companion page, or only record a candidate gap.

## Runtime Map Template

| Step | Runtime anchor | What happens | Documentation implication |
|---|---|---|---|
| 1 | exact string or symbol in `claude-code-pkg/...` at an approximate line/offset | Confirmed behavior | Why the behavior matters to readers |

Add a small Mermaid diagram only when it clarifies the flow better than a table.

## Full Analysis Quality Checks

- Source ranges are large enough to identify the enclosing wrapper function, package metadata boundary, SDK declaration, help text, or adjacent string cluster.
- Runtime behavior is not inferred from a single string hit; triangulate with wrapper files, SDK declarations, help output, command behavior, or adjacent strings.
- Exact strings and semantic names are both recorded.
- Existing docs are extended or cross-linked when possible.
- Any uncertain interpretation is labeled as a candidate gap, not documented as fact.