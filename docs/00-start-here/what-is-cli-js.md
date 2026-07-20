# What is the reverse-engineered `cli.js` artifact?

This page defines the artifact boundary for reverse-engineering how Claude Code works.

`cli.js` is the readable JavaScript entrypoint extracted from the Linux x64 Bun standalone package for `@anthropic-ai/claude-code@2.1.215`. It is not the original TypeScript source tree: it is bundled, minified, and paired with JavaScriptCore bytecode in the same Bun module graph.

For day-to-day reading, this repo publishes a derived view `claude-code-pkg/src/entrypoints/cli.renamed.js` produced by [`scripts/normalize-cli-js.mjs`](../../scripts/normalize-cli-js.mjs) and [`scripts/semantic-rename-cli.mjs`](../../scripts/semantic-rename-cli.mjs). It has identical runtime behavior to `cli.js` but with semantic identifier names recovered from export tables, runtime class names, dispatch handlers, string constants, and call-path property aliases. Source-anchor tables across this wiki reference the renamed view.

## Source anchors

| Semantic alias | Anchor | Meaning |
| --- | --- | --- |
| FinalArtifactExtractor | `TRAILER`, `MODULE_RECORD_SIZE`, `FINAL_ROOT_FILES` | Parses the Bun graph in memory and keeps only selected JS files. |
| BunEntrypointWrapper | `// @bun @bytecode @bun-cjs` | Bun CommonJS wrapper emitted for the entrypoint. |
| EmbeddedProductVersion | `VERSION: "2.1.215"`, `BUILD_TIME: "2026-07-19T00:01:04Z"` | Embedded product version/build used by version output and runtime metadata. |
| ExtractedArtifactIdentity | 20,160,986 bytes, SHA-256 `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` | Identity of the retained Linux x64 `cli.js`. |
| RootCommandSurface | `Claude Code - starts an interactive session by default` | User-facing root command assembled by the full runtime. |
| ImageProcessorShim | `require("/$bunfs/root/image-processor.node")` | Thin wrapper around an embedded N-API image module. |
| AudioCaptureShim | `require("/$bunfs/root/audio-capture.node")` | Thin wrapper around an embedded N-API audio module. |

## Artifact stack

```mermaid
flowchart TD
    Npm[wrapper npm package] --> Native[platform native package]
    Native --> Elf[Linux x64 Bun standalone ELF]
    Elf --> BunSection[.bun section]
    BunSection --> Graph[StandaloneModuleGraph]
    Graph --> Cli[src/entrypoints/cli.js]
    Graph --> Image[image-processor.js]
    Graph --> Audio[audio-capture.js]
    Graph --> NativeAddons[embedded .node addons retained locally and gitignored]
    Graph -. not retained .-> Jsc[JavaScriptCore bytecode]
```

The Bun payload contains five root modules. The final extractor retains the three readable JavaScript files and writes both native addons locally; `*.node` keeps the native binaries out of Git.

| Module | Role |
|---|---|
| `claude-code-pkg/src/entrypoints/cli.js` | The main bundled runtime: command parsing, TUI, headless runner, tools, sessions, MCP, plugins, agents, auth, models, telemetry, and updates. |
| `claude-code-pkg/image-processor.js` | CommonJS shim that refers to `/$bunfs/root/image-processor.node`. |
| `claude-code-pkg/audio-capture.js` | CommonJS shim that refers to `/$bunfs/root/audio-capture.node`. |
| `claude-code-pkg/image-processor.node` | Gitignored Linux x64 N-API image processor extracted from the graph. |
| `claude-code-pkg/audio-capture.node` | Gitignored Linux x64 N-API audio capture/playback module extracted from the graph. |

## What `cli.renamed.js` owns

Reverse-engineering `cli.renamed.js` shows it is the central agent runtime rather than a thin argument parser. Confirmed top-level ownership includes:

- Bun/bootstrap and product-version fast paths.
- Commander root command, root flags, and utility subcommands.
- Interactive TUI/session loop and resume picker.
- Print/headless runner, stream-JSON I/O, SDK transport, and control frames.
- Prompt/context inputs such as `CLAUDE.md`, settings, system-prompt flags, output styles, agents, skills, and MCP.
- Model/provider/auth selection across first-party, Bedrock, Vertex, Foundry, Anthropic AWS, Mantle, and API-key/OAuth paths.
- Built-in tools, permissions, hooks, MCP, plugins, IDE/Chrome integration, and settings policy.
- Local JSONL transcripts, resume/continue/fork/rewind, remote sessions, teleport, and Remote Control.
- Agents, background-by-default subagents, task tools, background sessions, deterministic dynamic workflows, `ultrareview`, and `auto-mode`.
- Accessibility and recovery modes including `--ax-screen-reader` and `--safe-mode`.
- Diagnostics, debug logs, telemetry/traffic gates, native updater, and media native modules.

## What it is not

- It is not clean source with original module names.
- It is not sourcemap-backed; temporary Bun graph inspection found no serialized sourcemap payload for this build.
- JavaScriptCore cached bytecode can be dumped for instruction-level research, but bytecode dumps are no longer retained as final artifacts and do not recover the original JavaScript/TypeScript.
- Minified anchors behind aliases such as `TopLevelMain`, `CommanderRoot`, `HeadlessRunner`, and `InteractiveSessionLoop` are version-specific. Use them only with exact string/offset anchors.

## Related docs

- [Main feature map](main-feature-map.md)
- [Package and Bun bootstrap](../01-runtime-lifecycle/package-and-bun-bootstrap.md)
