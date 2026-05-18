# Validation and Reporting

Use this reference before finishing any Claude Code reverse-engineering task.

## Validate Extraction and Atlas Work

If the extractor or atlas generator was touched or used, validate from the repository root:

```sh
node --check scripts/extract-claude-code-pkg.mjs
node --check scripts/index-claude-code.mjs
node scripts/extract-claude-code-pkg.mjs --help
node scripts/index-claude-code.mjs --help
```

For a full smoke test without committing large extracted artifacts, use a temporary output path and remove it afterward:

```sh
node scripts/extract-claude-code-pkg.mjs --out /tmp/claude-code-pkg-test
node scripts/index-claude-code.mjs --input /tmp/claude-code-pkg-test/sections/claude.bun --out /tmp/source-atlas-test
rm -rf /tmp/claude-code-pkg-test /tmp/source-atlas-test
```

For incremental mode, inspect `git diff -- source-atlas` before and after documentation edits so the final summary can distinguish generated baseline changes from hand-written docs changes.

## Validate Docs Work

When docs changed and a website exists, build the site from the repository root context:

```sh
cd website
npm run build
```

If terminal state may be unknown, use an absolute repository path before changing into `website/`. In zsh, avoid assigning to the readonly variable `status`; use a variable such as `rc` instead.

Then verify:

- Markdown page count is expected.
- The build completes successfully.
- Warnings are understood and unrelated.
- Git status contains only intended docs, atlas, skill, or script changes.
- New files are accounted for, including untracked files that `git diff --stat` omits.

For documentation-navigation work, add targeted repository checks as relevant:

- Markdown relative-link checks for `docs/**/*.md`.
- Stale old-filename scans after renames.
- Duplicate H1/title scans when page titles or Starlight loader behavior changed.
- Website route coverage checks comparing Markdown pages, `docs/SUMMARY.md`, and `website/astro.config.mjs` sidebar links.
- Generated HTML checks for page-level heading/title issues after website rendering changes.

## Report Completion

Summarize:

- Selected mode: full or incremental.
- Target call path, docs gap, or package delta.
- Key `source-atlas/` deltas if incremental, and whether they are docs-relevant.
- Files created or changed.
- Key source anchors used.
- Validation result.
- Remaining candidate gaps, if any.

Keep the summary concise and avoid pasting large docs content unless requested.

## Quality Checklist

- [ ] Mode was selected: full analysis or incremental `source-atlas` analysis.
- [ ] If incremental, `source-atlas/` baseline status and diff were checked before deep reads.
- [ ] Existing docs were checked first when docs were in scope.
- [ ] At least one source anchor directly supports each major claim.
- [ ] Exact strings and semantic names are both recorded.
- [ ] Duplicate documentation was avoided.
- [ ] `source-atlas/` was regenerated or intentionally left untouched, and that choice is reported.
- [ ] New pages are linked from the appropriate index and summary files.
- [ ] Backlog/counts were updated when applicable.
- [ ] Website build succeeded or any failure is explained with next steps.
- [ ] Final summary includes files changed and validation status.

## Common Pitfalls

- Broad binary search: search for specific env vars, flags, command names, protocol methods, and file paths instead.
- SDK-only conclusions: confirm with wrapper code, help output, runtime strings, or safe observable behavior.
- Location overprecision: use approximate lines or byte offsets plus exact strings.
- Doc duplication: extend or cross-link existing pages instead of creating parallel explanations.
- Atlas diff overclaiming: confirm runtime behavior before documenting a change.
- Accidental baseline overwrite: check Git status before regenerating `source-atlas/`; use `source-atlas-next/` for non-destructive comparison when unsure.
- Printable-string count noise: prioritize surface strings and semantic anchors before raw count changes.
- Untracked file blindness: `git diff --stat` omits new untracked pages; check status explicitly.
- Terminal directory drift: previous commands may leave the shell inside `website/`; use absolute paths when validating.
- Accidental package-artifact edits: bulk replacements should target docs, scripts, skill resources, or website files unless package artifact changes are explicitly requested.