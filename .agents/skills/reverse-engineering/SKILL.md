---
name: reverse-engineering
description: 'Use when reverse-engineering Claude Code npm/native packages, Bun standalone runtime artifacts, generated string/source atlases, package-version diffs, source anchors, documentation gaps, docs updates, or call-path diagrams.'
argument-hint: '[mode: full|incremental; target call path, source-atlas diff, docs gap, or package delta]'
user-invocable: true
---

# Reverse Engineering

## Purpose

Use this skill to reverse-engineer extracted Claude Code artifacts and turn confirmed behavior into source-anchored documentation. The workflow supports both broad reconstruction and package-update diff analysis.

Claude Code is distributed as a small npm wrapper package plus a platform-specific native package. Current Linux builds are Bun standalone ELF executables with a large `.bun` payload section. Generated atlas data is therefore a string-surface triage layer unless a readable text artifact is explicitly scanned.

## What This Skill Produces

- A gap assessment that explains which major Claude Code runtime paths are already documented and which are missing.
- A full analysis pass that reconstructs a subsystem from extracted wrapper files, native binary/string surfaces, SDK declarations, help output, and current docs.
- An incremental analysis pass that starts from `source-atlas/` diffs and focuses only on changed runtime surfaces.
- New or updated Markdown docs under `docs/` with source anchors, exact strings or symbols, semantic names, call-path tables, and diagrams when useful.
- Updated navigation, indexes, page counts, backlog notes, generated atlas references, and a validation summary.

## Repository Map

- Package extractor: `scripts/extract-claude-code-pkg.mjs`
- Source/string atlas generator: `scripts/index-claude-code.mjs`
- Extracted wrapper package: `claude-code-pkg/wrapper/`
- Extracted native package: `claude-code-pkg/native/`
- Native runtime binary: `claude-code-pkg/native/claude` or `claude-code-pkg/native/claude.exe`
- Optional Bun payload dump: `claude-code-pkg/sections/claude.bun`
- Extraction metadata: `claude-code-pkg/metadata.json`
- Source atlas baseline: `source-atlas/`
- Optional temporary comparison atlas: `source-atlas-next/`
- Optional test extraction: `artifacts/claude-code-pkg-test/`
- Documentation root: `docs/`
- Website validation directory, if present: `website/`

## Choose a Mode

| Mode | Use when | Primary inputs | Primary output |
|---|---|---|---|
| Full analysis | The request asks for a new subsystem map, broad gap-finding, first-time documentation, or a topic with no obvious atlas delta. | `claude-code-pkg/metadata.json`, `wrapper/`, `native/claude`, optional `sections/claude.bun`, existing docs, SDK declaration files, help output, and targeted atlas searches. | Reconstructed call path, confirmed source anchors, and new or updated docs. |
| Incremental analysis | The request asks what changed after a package update, mentions diff/comparison/regression, or wants docs updated from a new Claude Code version. | Committed `source-atlas/` baseline, regenerated atlas output, Git diffs, extraction metadata, and focused reads around changed surfaces. | Change triage, affected docs list, targeted artifact reads, and minimal docs/source-atlas updates. |

Selection rules:

- If the user explicitly asks for full analysis, broad reconstruction, new subsystem mapping, or gap discovery, use full analysis.
- If the user explicitly asks for incremental analysis, package-update comparison, regressions, diffs, or `source-atlas/` changes, use incremental analysis.
- If the task follows a package extraction or bundle update and the user does not specify a mode, prefer incremental analysis.
- If `source-atlas/` is missing or cannot serve as a previous baseline, explain the limitation and fall back to full analysis unless Git history provides a usable baseline.

## Progressive References

Load only the reference files needed for the selected task:

- Full subsystem reconstruction: [`./references/full-analysis.md`](./references/full-analysis.md)
- Incremental atlas-diff triage: [`./references/incremental-analysis.md`](./references/incremental-analysis.md)
- Source search and anchor handling: [`./references/source-reading.md`](./references/source-reading.md)
- Documentation writing and navigation updates: [`./references/docs-writing.md`](./references/docs-writing.md)
- Validation, reporting, and quality gates: [`./references/validation.md`](./references/validation.md)

## Quick Procedure

1. Identify the requested subsystem or package delta and choose full or incremental mode.
2. Review existing docs and indexes before reading generated atlas or binary surfaces.
3. Inspect the source-material trust model before deciding what counts as proof.
4. Extract or inspect `claude-code-pkg/` and prepare or inspect `source-atlas/` when it helps discovery or diff triage.
5. Build a narrow anchor plan using semantic names, exact strings, flags, env vars, slash commands, MCP methods, tool names, package files, and atlas surfaces.
6. Read focused artifact ranges, wrapper files, SDK declarations, and help text until behavior is confirmed as far as the available artifacts allow.
7. Reconstruct either the runtime call path or the incremental change map.
8. Patch existing docs or create focused new pages, then update navigation, website sidebar, atlas references, and backlog files as needed.
9. Validate changed artifacts and report the selected mode, source anchors, files changed, and remaining gaps.

## Operating Principles

- Start from current docs, not from a blank page.
- Search narrowly; broad binary/string scans are noisy.
- Treat `source-atlas/` as a triage layer, not behavioral proof.
- Anchor every major claim with file path, approximate line or byte offset, exact string/symbol, and semantic interpretation.
- Preserve exact runtime strings and add stable semantic names alongside them.
- Prefer extending or cross-linking existing docs over creating duplicates.
- In incremental mode, prioritize changed env vars, slash commands, MCP methods, tool names, config paths, package metadata, and high-signal strings before raw count changes.
- Use careful language for compiled/minified artifacts and avoid overclaiming intent.
- Keep public internals docs focused on runtime behavior; do not expose planning-stage or project-management terminology.
- Do not edit extracted package artifacts unless the user explicitly asks for package-file changes.

## Completion Gate

Before finishing, confirm that:

- The mode was selected and reported.
- Existing docs were checked first when docs were in scope.
- Each major claim has a direct source anchor.
- `source-atlas/` was regenerated, compared, or intentionally left untouched, and that choice is reported.
- New or moved docs are linked from the appropriate indexes and summary files.
- Validation succeeded, or any failure is explained with next steps.
- Git status contains only intended changes.

## Example Prompts

- `/reverse-engineering full analysis of Claude Code package layout and startup`
- `/reverse-engineering full analysis of slash command routing and TUI mode dispatch`
- `/reverse-engineering full analysis of MCP tools, resources, prompts, and timeout policy`
- `/reverse-engineering incremental package update: use source-atlas diff to find new env vars, commands, and docs changes`
- `/reverse-engineering compare the new Claude Code binary against source-atlas and identify docs-relevant runtime deltas`
- `/reverse-engineering audit whether tools, permissions, hooks, and agents are already documented`