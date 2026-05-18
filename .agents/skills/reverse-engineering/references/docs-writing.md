# Documentation Writing and Navigation

Use this reference when deciding whether to create, patch, cross-link, or defer documentation.

## Audit Existing Docs First

Read the relevant indexes and candidate pages before creating new docs when they exist:

- `docs/README.md`
- `docs/SUMMARY.md`
- Section `README.md` files under `docs/*/`
- `docs/99-research-atlas/documentation-opportunities.md`
- Existing pages matching subsystem keywords

Classify the target before editing.

| Classification | Action |
|---|---|
| Already deeply covered | Do not create a duplicate page; optionally add a cross-link or small source-anchor update. |
| Partially covered | Extend the existing page or create a focused companion page. |
| Mentioned only by SDK/type/atlas surfaces | Create a runtime lifecycle page only if wrapper/help/binary evidence confirms behavior. |
| Not covered | Create a focused page after source confirmation. |

In incremental mode, classify each changed atlas surface as already documented, stale existing doc, new runtime surface, or scan noise.

## Choose the Docs Section

- Start/orientation and feature map: `docs/00-start-here/`
- Package layout, startup, CLI flags, TUI modes, slash commands, rendering, and shutdown entry points: `docs/01-runtime-lifecycle/`
- Prompt/context assembly, `CLAUDE.md`, memory, settings, output styles, models, providers, retries, quota, and usage: `docs/02-context-model-loop/`
- Tools, MCP, IDE/LSP/web integrations, permissions, hooks, sandboxing, and config policy: `docs/03-tools-integrations-security/`
- Sessions, transcripts, resume/continue, export, local state, and remote/API boundaries: `docs/04-sessions-persistence-remote/`
- Diagnostics, telemetry, debug logs, updates, crash handling, and operational support: `docs/05-hosted-agent-ops/`
- Agents, tasks, custom agents/skills, subagents, background work, automation, and scheduled prompts: `docs/06-agents-automation/`
- Generated source/string atlas, documentation opportunities, methodology, and future watchpoints: `docs/99-research-atlas/`

## Decide the Documentation Change

- Patch an existing page when it already has the right scope.
- Create a focused companion page when the path is complex and the existing page is broad.
- Create a runtime lifecycle page when only SDK/type listings or raw atlas entries exist.
- Mark backlog items closed or narrow remaining gaps when the work resolves a known gap.
- If evidence is weak, avoid a full page and record only a candidate note when useful.
- In incremental mode, prefer minimal patches over new pages unless the delta exposes a genuinely new lifecycle or subsystem.

## Page Contents

Each new or materially updated page should include:

- Purpose and scope.
- Source anchor table with file, approximate location, exact string/symbol, and semantic meaning.
- Reconstructed call path or change map.
- Key data structures, env vars, commands, flags, MCP methods, settings, tool names, feature gates, or API boundaries.
- User-visible behavior or operational implications.
- Edge cases, cleanup, failure modes, and caveats.
- Related docs and residual gaps.

## Navigation and Backlog Updates

After adding or moving a page, update all relevant indexes that exist:

- Nearest section `README.md`.
- `docs/SUMMARY.md`.
- `docs/README.md` page list and page count if it tracks one.
- Root `README.md` if it tracks docs counts.
- `website/astro.config.mjs` sidebar when the page should be reachable from the website navigation.
- `scripts/index-claude-code.mjs` known anchors or documentation references when atlas output should point at renamed or newly canonical pages.
- Regenerated `source-atlas/` output when atlas references or known doc links change.
- `docs/99-research-atlas/documentation-opportunities.md` when the work closes or narrows a known gap.

Also add cross-links from adjacent pages so readers can discover the path from related concepts.

## Writing Style

- Use English prose in skill resources and repository docs unless a target doc intentionally uses another language.
- Say “approximately” for bundle line numbers and binary offsets.
- Preserve exact strings, flags, environment variables, and package names.
- Distinguish SDK/type surfaces from runtime implementation.
- Avoid overclaiming intent when only binary strings are visible.
- Avoid project-process language in published internals docs. Prefer reader-facing terms such as “runtime boundary,” “source anchor,” “call path,” “confirmed behavior,” “candidate gap,” and “research note.”
- Pair physical reorganization with content work: after renames or moves, revise scope statements, handoff links, and reader contracts instead of only changing paths.
- Keep raw atlas findings, weak constants-only leads, and binary-only notes in `docs/99-research-atlas/` until source-confirmed.