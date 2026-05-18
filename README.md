# Claude Code package artifacts

This workspace extracts and reverse-engineers the Claude Code runtime:

- Readable JavaScript files from Bun's embedded `/$bunfs/root` payload, mirrored into `claude-code-pkg/`.
- Native N-API addons (`audio-capture.node`, `image-processor.node`) extracted alongside their JS shims.
- A formatted + scope-renamed copy of `cli.js` (`cli.renamed.js`) with 8,690 semantic bindings applied from evidence in the bundle.
- Derived analysis data: bundle module map, prompt template catalog.

Retained JavaScript and derived artifacts live under `claude-code-pkg/` and `docs/`. Temporary inputs are pruned because they are large and reproducible. The two `.node` binaries are written to disk but gitignored via `*.node`.

## One-step extraction

```sh
node scripts/extract-claude-code-final-artifacts.mjs
```

The script reuses an existing `claude-code-pkg/` extraction when present. If required package inputs are missing, it runs `scripts/extract-claude-code-pkg.mjs` automatically first. By default it prunes `wrapper/`, `native/`, and `sections/` after the final artifacts are generated; pass `--keep-inputs` if you want to retain those temporary inputs.

## Outputs

| Path | Purpose |
|---|---|
| `claude-code-pkg/src/entrypoints/cli.js` | Primary readable bundled Claude Code runtime extracted from `/$bunfs/root/src/entrypoints/cli.js`. |
| `claude-code-pkg/src/entrypoints/cli.formatted.js` | Prettier-formatted + unicode-decoded copy of `cli.js` (regenerable). |
| `claude-code-pkg/src/entrypoints/cli.renamed.js` | Scope-aware semantically renamed `cli.formatted.js`; primary reading surface for docs (regenerable). |
| `claude-code-pkg/src/entrypoints/cli.renames.json` | Rename report with evidence + replacement counts (regenerable). |
| `claude-code-pkg/image-processor.js`, `claude-code-pkg/audio-capture.js` | JavaScript shims extracted from `/$bunfs/root`. |
| `claude-code-pkg/image-processor.node`, `claude-code-pkg/audio-capture.node` | Stripped N-API native addons extracted from the Bun standalone graph. **Gitignored** via `*.node`; regenerable. |
| `docs/99-research-atlas/data/cli-modules.json` | 3,814 Bun modules with loader line + declared names + exports (regenerable). |
| `docs/99-research-atlas/data/cli-module-themes.json` | 38 themes built from semantic-name regex matches over the module map (regenerable). |
| `docs/99-research-atlas/data/prompt-catalog.json` | AST-extracted prompt-shaped literals (~1,086) with full text + provenance (regenerable). |
| `docs/02-context-model-loop/prompts/*.md` | Per-category prompt full-text shards generated from `prompt-catalog.json`. |

The final extractor intentionally does not keep `metadata.json`, `bun-standalone-graph/`, `jsc-bytecode-dump/`, or `prompt-catalog/` from the original package.

Temporary input directories, when retained with `--keep-inputs`:

| Path | Purpose |
|---|---|
| `claude-code-pkg/wrapper/` | Extracted npm wrapper package. Not needed after final artifacts are generated. |
| `claude-code-pkg/native/` | Extracted platform-native package and native binary. Needed only while extracting the `.bun` payload. |
| `claude-code-pkg/sections/claude.bun` | Raw Bun payload section dump. Needed only to regenerate final JS files without re-downloading. |

## Individual tools

```sh
node scripts/extract-claude-code-pkg.mjs
node scripts/extract-claude-code-final-artifacts.mjs
```

The one-step extractor parses the Bun graph in memory, mirrors the useful JS payload (`cli.js`, JS shims) **and the two `.node` native addons** into the package root, then removes package metadata, graph metadata, bytecode dumps, and prompt catalogs.

## Normalize `cli.js` for reading

The retained `cli.js` is source text from the Bun payload, but it is bundled/minified, uses Bun-era syntax such as `using`, and contains many escaped Unicode sequences. For reverse-engineering reads, generate a formatted and safely unescaped copy next to `cli.js`:

```sh
pnpm run normalize:cli
# or:  node scripts/normalize-cli-js.mjs
```

By default this writes `claude-code-pkg/src/entrypoints/cli.formatted.js`. The script stitches physical newlines outside strings/templates/comments into spaces, decodes safe printable `\uXXXX`, `\u{...}`, and `\xHH` escapes into characters, then runs Prettier to emit full JavaScript code blocks. Escapes that could change JavaScript boundaries, such as quotes, backslashes, line terminators, template hazards, and control characters, are left as escapes.

Use `--no-format` when you only want the stitched/unescaped text without Prettier formatting.

## Semantically rename `cli.formatted.js`

The minified bundle does not contain enough information to recover every original source name. For reviewable reverse-engineering names, generate an evidence-backed semantic rename pass:

```sh
pnpm run rename:cli
# or:  node scripts/semantic-rename-cli.mjs
```

By default this reads `claude-code-pkg/src/entrypoints/cli.formatted.js` and writes:

| Path | Purpose |
|---|---|
| `claude-code-pkg/src/entrypoints/cli.renamed.js` | Scope-aware renamed JavaScript for reading. |
| `claude-code-pkg/src/entrypoints/cli.renames.json` | Rename report with old names, semantic names, evidence, and replacement counts. |

The renamer only applies high-confidence aliases from evidence present in `cli.formatted.js`, such as export tables shaped like `j$(module, { semanticName: () => obfuscatedName })`, runtime class names like `this.name = "TeleportOperationError"`, direct string dispatch handlers like `kind === "switch_browser"`, string constants like `code = "unexpected_error"`, and call-path property aliases like `{ GetRoleCredentialsCommand: obfuscatedName }` or `Messages.BetaToolRunner = obfuscatedName`. It intentionally skips lower-confidence guesses from generic property keys, function parameters, or speculative call-graph propagation.

## Derived analysis data

Two Babel-AST passes turn `cli.renamed.js` into the data that powers the atlas pages.

### Bundle module map

```sh
pnpm run extract:atlas
# or:  node scripts/extract-cli-module-map.mjs
```

Walks every Bun module loader (`var X = T(() => { ... })`), attaches surrounding declarations and export tables, then classifies each module by keyword regex over the semantic names. Output: [`docs/99-research-atlas/data/cli-modules.json`](docs/99-research-atlas/data/cli-modules.json) (3,814 modules) and [`docs/99-research-atlas/data/cli-module-themes.json`](docs/99-research-atlas/data/cli-module-themes.json) (38 themes). Narrative: [Bundle module map](docs/99-research-atlas/module-map-from-renamed-cli.md).

### Prompt template catalog

```sh
pnpm run extract:prompts
# or:  node --max-old-space-size=8192 scripts/extract-prompt-catalog.mjs
```

Parses every long string / template literal in `cli.renamed.js`, filters by domain keyword + prose ratio + SDK-noise blacklist, categorises into 9 buckets (system / tool / security / agent / mcp-plugin-hook / slash-command-file / output-style / structured-output / misc), and emits both machine-readable JSON and per-category Markdown shards carrying **full prompt text** (template-literal interpolation preserved as `${…}`). Outputs: [`docs/99-research-atlas/data/prompt-catalog.json`](docs/99-research-atlas/data/prompt-catalog.json) and [`docs/02-context-model-loop/prompts/*.md`](docs/02-context-model-loop/prompts/). Index page: [Prompt template catalog](docs/02-context-model-loop/prompt-template-catalog.md).

## Analysis docs

Reverse-engineering notes live under [`docs/`](docs/). Start with [`docs/00-start-here/README.md`](docs/00-start-here/README.md) for the canonical wiki path, or jump directly to [`docs/01-runtime-lifecycle/cli-main-paths.md`](docs/01-runtime-lifecycle/cli-main-paths.md) for the reconstructed `cli.js` bootstrap, command-line routing, and major runtime paths.

The section index is in [`docs/SUMMARY.md`](docs/SUMMARY.md). Highlights:

- [`docs/99-research-atlas/module-map-from-renamed-cli.md`](docs/99-research-atlas/module-map-from-renamed-cli.md) — bundle module map with 38 themes.
- [`docs/02-context-model-loop/prompt-template-catalog.md`](docs/02-context-model-loop/prompt-template-catalog.md) — index into the per-category prompt shards (full text of ~1,086 prompts).
- [`docs/05-hosted-agent-ops/audio-capture-native.md`](docs/05-hosted-agent-ops/audio-capture-native.md) and [`docs/05-hosted-agent-ops/image-processor-native.md`](docs/05-hosted-agent-ops/image-processor-native.md) — binary-level reverse engineering of the two Rust N-API addons (cpal + ALSA / Rust `image` crate ecosystem).

## Website wiki

The static wiki lives in `website/` and reuses the Markdown files under `docs/` directly through a custom Astro/Starlight content loader.

```sh
cd website
npm install
npm run dev
npm run build
```

GitHub Pages deployment is configured in `.github/workflows/deploy-website.yml`. The default production URL is `https://claude-code.genisisiq.com`; change `website/public/CNAME` and `SITE_URL` in the workflow if the domain changes.
