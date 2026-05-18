# Claude Code package artifacts

This workspace extracts only the final Claude Code runtime artifacts we care about:

- Readable JavaScript files from Bun's embedded `/$bunfs/root` payload, mirrored into `claude-code-pkg/`.

Retained JavaScript artifacts live under `claude-code-pkg/`. Temporary inputs and pruned generated outputs are ignored because they are large and reproducible.

## One-step extraction

```sh
node scripts/extract-claude-code-final-artifacts.mjs
```

The script reuses an existing `claude-code-pkg/` extraction when present. If required package inputs are missing, it runs `scripts/extract-claude-code-pkg.mjs` automatically first. By default it prunes `wrapper/`, `native/`, and `sections/` after the final artifacts are generated; pass `--keep-inputs` if you want to retain those temporary inputs.

## Outputs

| Path | Purpose |
|---|---|
| `claude-code-pkg/src/entrypoints/cli.js` | Primary readable bundled Claude Code runtime extracted from `/$bunfs/root/src/entrypoints/cli.js`. |
| `claude-code-pkg/image-processor.js`, `claude-code-pkg/audio-capture.js` | JavaScript shims extracted from `/$bunfs/root`. |

The final extractor intentionally does not keep `metadata.json`, `bun-standalone-graph/`, `jsc-bytecode-dump/`, `prompt-catalog/`, or embedded `.node` addons.

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

The one-step extractor parses the Bun graph in memory, mirrors the useful JS payload into the package root, and removes package metadata, graph metadata, bytecode dumps, prompt catalogs, and native `.node` addons.

## Normalize `cli.js` for reading

The retained `cli.js` is source text from the Bun payload, but it is bundled/minified, uses Bun-era syntax such as `using`, and contains many escaped Unicode sequences. For reverse-engineering reads, generate a formatted and safely unescaped copy next to `cli.js`:

```sh
node scripts/normalize-cli-js.mjs
```

By default this writes `claude-code-pkg/src/entrypoints/cli.formatted.js`. The script stitches physical newlines outside strings/templates/comments into spaces, decodes safe printable `\uXXXX`, `\u{...}`, and `\xHH` escapes into characters, then runs Prettier to emit full JavaScript code blocks. Escapes that could change JavaScript boundaries, such as quotes, backslashes, line terminators, template hazards, and control characters, are left as escapes.

Use `--no-format` when you only want the stitched/unescaped text without Prettier formatting.

## Semantically rename `cli.formatted.js`

The minified bundle does not contain enough information to recover every original source name. For reviewable reverse-engineering names, generate an evidence-backed semantic rename pass:

```sh
node scripts/semantic-rename-cli.mjs
```

By default this reads `claude-code-pkg/src/entrypoints/cli.formatted.js` and writes:

| Path | Purpose |
|---|---|
| `claude-code-pkg/src/entrypoints/cli.renamed.js` | Scope-aware renamed JavaScript for reading. |
| `claude-code-pkg/src/entrypoints/cli.renames.json` | Rename report with old names, semantic names, evidence, and replacement counts. |

The renamer only applies high-confidence aliases from evidence present in `cli.formatted.js`, such as export tables shaped like `j$(module, { semanticName: () => obfuscatedName })`, runtime class names like `this.name = "TeleportOperationError"`, direct string dispatch handlers like `kind === "switch_browser"`, string constants like `code = "unexpected_error"`, and call-path property aliases like `{ GetRoleCredentialsCommand: obfuscatedName }` or `Messages.BetaToolRunner = obfuscatedName`. It intentionally skips lower-confidence guesses from generic property keys, function parameters, or speculative call-graph propagation.

## Analysis docs

Reverse-engineering notes live under `docs/`. Start with [`docs/00-start-here/README.md`](docs/00-start-here/README.md) for the canonical wiki path, or jump directly to [`docs/01-runtime-lifecycle/cli-main-paths.md`](docs/01-runtime-lifecycle/cli-main-paths.md) for the reconstructed `cli.js` bootstrap, command-line routing, and major runtime paths.

## Website wiki

The static wiki lives in `website/` and reuses the Markdown files under `docs/` directly through a custom Astro/Starlight content loader.

```sh
cd website
npm install
npm run dev
npm run build
```

GitHub Pages deployment is configured in `.github/workflows/deploy-website.yml`. The default production URL is `https://claude-code.genisisiq.com`; change `website/public/CNAME` and `SITE_URL` in the workflow if the domain changes.
