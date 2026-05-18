# Incremental Analysis Mode

Use incremental analysis after a Claude Code package or native binary update. This mode treats the committed `source-atlas/` directory as the baseline, regenerates or compares atlas output, and then reads only source/artifact ranges that correspond to docs-relevant deltas.

## Baseline Rules

1. Check Git status before regenerating anything so you know whether `source-atlas/` is clean, modified, or untracked.
2. If the extracted package has been updated and `source-atlas/` is clean, run `node scripts/index-claude-code.mjs` to regenerate the baseline in place, then inspect `git diff -- source-atlas`.
3. If you need a non-destructive comparison, run `node scripts/index-claude-code.mjs --out source-atlas-next`, compare `source-atlas/` with `source-atlas-next/`, and remove or explicitly report the temporary directory when done.
4. For a new package version without overwriting the baseline, extract to a temporary directory such as `artifacts/claude-code-pkg-test/`, then run `node scripts/index-claude-code.mjs --input artifacts/claude-code-pkg-test/sections/claude.bun --out source-atlas-next`.
5. If no previous atlas baseline exists, explain that incremental comparison is limited and fall back to full analysis for behavior reconstruction.

## Diff Reading Order

Read atlas diffs in this order:

1. `source-atlas/summary.json` for source hash, byte count, printable-string count, and aggregate surface count changes.
2. `source-atlas/surface-index.json` and `source-atlas/constants.md` for env vars, model/provider strings, slash commands, MCP/JSON-RPC methods, tool-name hits, config paths, and package support files.
3. `source-atlas/README.md` for main path seed or semantic anchor movement.
4. `source-atlas/declarations.json` only when the input is readable text; in binary mode it is intentionally empty.

## Delta Triage

Classify each meaningful delta before reading deep artifact ranges.

| Delta type | Initial action |
|---|---|
| Package layout or native target | Confirm in `metadata.json`, wrapper `package.json`, `install.cjs`, and native package metadata. |
| User-visible slash command or CLI flag | Confirm parser/help behavior with help text or adjacent binary strings, then update CLI/TUI docs if needed. |
| Provider, model, or auth surface | Confirm environment variables, SDK declarations, config files, and help text before updating model/auth docs. |
| MCP method or config key | Confirm protocol method cluster, settings shape, and timeout/policy strings before updating MCP docs. |
| Built-in tool or permission surface | Confirm tool-name cluster, permission strings, hooks, and user-facing docs/help before updating tool/security docs. |
| Hook, agent, or automation surface | Confirm hook names, agent/task strings, settings, and SDK declarations before updating automation docs. |
| Session, transcript, resume, or local-state path | Confirm file-path strings, flags, help output, and adjacent settings before updating persistence docs. |
| Observability or operations surface | Confirm env vars, diagnostics strings, log paths, and help output before updating operations docs. |
| Raw printable-string count movement | Treat as low-priority noise unless tied to a named anchor or changed high-signal surface. |

## Focused Source Reads

- Seed searches from changed strings, env vars, slash commands, flags, MCP methods, file paths, tool names, or package metadata.
- Read only around deltas that may affect behavior or docs.
- Do not re-read unrelated subsystems just because printable-string counts changed.
- Confirm behavior with wrapper code, SDK declarations, help output, command behavior, or coherent adjacent string clusters before updating docs.

## Incremental Change Map Template

| Delta | Atlas/source anchor | Interpretation | Documentation action |
|---|---|---|---|
| New or changed surface | `source-atlas/surface-index.json`; `claude-code-pkg/...` around an approximate line/offset | Confirmed behavior or rejected false positive | Patch, create, cross-link, or ignore with reason |

## Baseline Handling

- Keep regenerated `source-atlas/` changes when they represent the new package baseline.
- Do not keep `source-atlas-next/` or temporary extracted package directories unless the user explicitly asks to preserve them.
- In the final report, distinguish generated atlas changes from hand-written documentation changes.
- Never claim behavior changed from atlas diffs alone; atlas output points to where source/artifact reading should happen.