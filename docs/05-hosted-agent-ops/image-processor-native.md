# Image processor native module

This page is an artifact-level reverse-engineering writeup of `image-processor.node`, the Bun-embedded native addon behind Claude Code's sharp-compatible image façade. It combines the exact Linux-x64 binary surface with the readable JavaScript resize/re-encode policy. Native scheduling and clipboard implementation details remain opaque unless directly observed.

The `.node` binary is regenerated locally by [`scripts/extract-claude-code-final-artifacts.mjs`](../../scripts/extract-claude-code-final-artifacts.mjs) (now in the final-keep allow-list) and is held outside git via `*.node` in [`.gitignore`](../../.gitignore). This page works off the linux-x64 build of `@anthropic-ai/claude-code@2.1.215`. Its SHA-256 is unchanged from the prior `2.1.143` snapshot.

## ELF metadata

| Item | Value |
|---|---|
| Path | [`claude-code-pkg/image-processor.node`](../../claude-code-pkg/image-processor.node) |
| Type | ELF 64-bit LSB shared object, x86-64, dynamically linked, **stripped** |
| Size | 1,464,760 bytes (1.4 MiB) |
| SHA-256 | `37bec7de530676e3dfe963d34a824b49191595809a8072348a2ef4571f1e5f4d` |
| Bun graph path | `/$bunfs/root/image-processor.node` |
| Defined dynamic symbol | `napi_register_module_v1` (single export — standard Node-API entrypoint) |

## ABI surface

| Layer | Evidence |
|---|---|
| Dynamic library deps (`readelf -d`) | `libm.so.6`, `libpthread.so.0`, `libc.so.6`, `libdl.so.2`, `ld-linux-x86-64.so.2` — **no** `libpng` / `libjpeg` / `libwebp` / `libheif` / `libvips` / `libX11` / `libwayland-client`. All image codecs are statically linked. |
| Minimum glibc | `GLIBC_2.17` (driven by `clock_gettime`); CentOS 7 / Ubuntu 14.04+ compatible. |
| Rust toolchain | Source paths embedded as panic locations carry the rustc commit `01f6ddf7588f42ae2d7eb0a2f21d44e8e96674cf`. |
| Stack / TLS | Non-executable stack (`GNU_STACK` empty perms), `GNU_RELRO` set on `.data.rel.ro`. |
| N-API surface | 43 unique undefined `napi_*` imports: `napi_create_threadsafe_function`, `napi_define_class`, `napi_create_promise`, `napi_resolve_deferred`, `napi_reject_deferred`, `napi_create_external_buffer`, `napi_create_buffer`, `napi_create_function`, `napi_get_cb_info`, full property / reference / typeof / coercion helpers. |

## Source provenance — statically linked Rust crates

Rust embeds the source file path of each function into panic locations; the binary therefore tells us exactly which crates and versions are linked in. Recovered set:

| crate | Version | Role |
|---|---|---|
| `napi` | 2.16.17 | napi-rs binding layer (Promise / class / threadsafe-fn / external buffer plumbing). |
| `image` | 0.25.10 | Top-level pixel buffer + format dispatch + metadata; defines the `Rgb8` / `Rgba8` / `L8` / `L16` / `Rgb16` / `Rgba16` / `Rgb32F` / `Rgba32F` layouts and a `Limits` guard. |
| `png` | 0.18.1 | PNG decoder / encoder; the PNG chunk names `bKGD`, `cHRM`, `gAMA`, `iCCP`, `eXIf`, `acTL`, `fcTL`, `fdAT`, `mDCV`, `cLLI`, `cICP`, `tRNS`, `tEXt`, `zTXt`, `sBIT` are visible in `.rodata`. |
| `image-webp` | 0.2.4 | WebP decoder + encoder, including VP8 lossy and the lossless transforms. |
| `zune-jpeg` | 0.5.13 | JPEG decoder; marker table (`SOF`, `DHT`, `DAC`, `RST`, `SOI`, `EOI`, `SOS`, `DQT`, `DNL`, `DRI`, `APP`, `COM`) embedded. |
| `zune-core` | 0.5.1 | Shared zune-* utilities. |
| `flate2` | 1.1.9 | High-level DEFLATE façade. |
| `fdeflate` | 0.3.7 | Fast DEFLATE (PNG zlib hot path). |
| `miniz_oxide` | 0.8.9 | Pure-Rust DEFLATE fallback. |
| `tokio` | 1.50.0 | Async-runtime code is linked; the stripped artifact does not establish which image operations it schedules. |
| `once_cell` | 1.21.4 | Lazy/global storage support; the concrete stored values are not recovered here. |

`addr2line-0.25.1` / `gimli-0.32.3` / `hashbrown-0.16.1` / `rustc-demangle-0.1.26` are present too but only service Rust panic backtraces; they are not part of the image pipeline.

**Implication**: the artifact is not dynamically linked to `sharp`/libvips or external PNG/JPEG/WebP shared libraries. It contains napi-rs and Rust image-codec code in one addon. That dependency inventory does not by itself establish every accepted format. In a safe exact-artifact probe, GIF input rejected with `The image format Gif is not supported`; PNG/JPEG/WebP are the formats exercised by the readable Claude Code transformation façade.

## JavaScript surface

### Module exports (registered by `napi_register_module_v1`)

Recovered from error strings such as `Failed to register function \`process_image\`` / `\`has_clipboard_image\`` / `\`read_clipboard_image\`` and `Failed to construct class \`ImageProcessor\``:

| Export | Kind | Linux behaviour |
|---|---|---|
| `processImage(input)` | standalone fn | Returned a Promise in an exact-artifact probe. Which native executor performs its work is not established. |
| `hasClipboardImage()` | standalone fn | Export observed. Its Linux return behavior was not exercised in this audit. |
| `readClipboardImage()` | standalone fn | Export observed. Its Linux return/error behavior was not exercised in this audit. |
| `ImageProcessor` | class/export | Export observed; the readable façade consumes instances returned by `processImage`. |

### `ImageProcessor` class

```text
class ImageProcessor {
  constructor(input)
  metadata()                            // → { width, height, format, … }
  resize(width, height, opts)           // chainable, mutates state
  jpeg(quality)                         // set output codec
  png(opts)                             // set output codec
  webp(quality)                         // set output codec
  toBuffer() -> Promise<Buffer>         // consume: execute pipeline, returns encoded bytes
  dispose()                             // idempotent explicit cleanup
}
```

The binary contains the error string `ImageProcessor already consumed (toBuffer/dispose was called)`, consistent with a one-shot native object. The readable façade independently guarantees that its own `metadata()` and `toBuffer()` paths call `dispose()` in `finally`.

### Call path from `cli.renamed.js`

The JS-side façade [`sharp()` at cli.renamed.js#L272868](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L272868) lazily loads the addon, buffers `resize` / `jpeg` / `png` / `webp` calls into a closure queue, then on `toBuffer()` awaits `processImage(input)` and replays the queue. `metadata()` does not replay transformations. Both terminal operations dispose the returned native object in `finally`, including when metadata lookup or encoding throws.

The shim that brings the addon into the bundle is the Bun CJS wrapper at [`claude-code-pkg/image-processor.js`](../../claude-code-pkg/image-processor.js); it is the JS half of the `require("/$bunfs/root/image-processor.node")` bridge.

## Concurrency evidence and limit

The addon imports Promise/deferred and threadsafe-function N-API calls and contains Tokio code. `processImage()` returned a Promise in the exact-artifact probe, and the JS façade awaits both it and `toBuffer()`. These facts establish an asynchronous JavaScript contract, not the native execution schedule. Without disassembly or tracing, this audit cannot prove:

- that every decode or encode runs on a Tokio worker;
- that `processImage()` and `toBuffer()` use separate worker jobs;
- that CPU-heavy work can never execute on the JS thread;
- how cancellation, panic, or disposal interacts with in-flight native work.

Strings such as `Panic in async function`, `Resolve deferred value failed`, and threadsafe-function imports are possible boundary machinery, not a recovered call path.

## Source-confirmed transformation policy

The high-level resize policy is readable in `oit()` around [`cli.renamed.js:279205`](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L279205):

1. Reject an empty input and inspect native metadata.
2. Return the original bytes when raw size and dimensions are already within the caller's limits.
3. For an over-byte-limit PNG, first try PNG compression level 9 with palette conversion.
4. Try JPEG qualities `80`, `60`, `40`, then `20` when re-encoding is needed.
5. If dimensions exceed the API bounds, scale inside the maximum width/height with `withoutEnlargement: true`, then repeat PNG/JPEG compression as needed.
6. As a last encoding attempt, cap width at 1,000 pixels and emit JPEG quality 20.
7. If native processing fails, preserve the original only when header-derived dimensions and base64 size are still safe; otherwise return a text-facing resize/compression error rather than forwarding an unsafe attachment.

This policy is JavaScript orchestration. It does not reveal native interpolation kernels, codec defaults omitted from calls, memory ownership, or task scheduling.

## Defensive limits and error surfaces

| Guard | Source string (excerpt) | Meaning |
|---|---|---|
| Dimension caps | `Image width N greater than width limit M`, `Image height N greater than height limit M`, `Image size exceeds limit`, `width and height must be >= 1 and <= 65535` | `image::Limits` is enabled with non-trivial bounds; rejects oversize inputs without allocating. |
| Memory budget | `MemoryLimitExceeded` | Decoder allocates against a `Limits.max_alloc` and fails fast. |
| Decompression budget | `Out of decompression space. Try with a larger limit.` | PNG zlib bomb defence. |
| Stream integrity | `Corrupt deflate stream`, `CrcMismatch`, `BadZlibHeader`, `DistanceTooFarBack`, `WrongChecksum`, `Invalid PNG signature.`, `Invalid WebP signature:` | Both `fdeflate` and `miniz_oxide` reject malformed inputs; the encoders refuse to write with `can't write indexed image without palette`, `the dimension and position go over the frame boundaries`, etc. |
| Metadata caps | `ICC profile too large`, `Unable to compress text metadata`, `The text metadata cannot be encoded into valid ISO 8859-1` | PNG tEXt / iCCP guards. |
| JPEG feature gating | `The library cannot yet decode images encoded using Extended Sequential Huffman encoding scheme yet.`, `… Lossless Huffman …`, `… Extended Sequential DCT Arithmetic …`, `… Progressive DCT Arithmetic …`, `… Lossless Arithmetic …` | `zune-jpeg` is the baseline / progressive Huffman path only — uncommon JPEG variants surface explicit errors instead of crashing. |

## Clipboard boundary

`hasClipboardImage` and `readClipboardImage` are exported by the exact artifact. No `libX11` or `libwayland-client` dynamic dependency was observed, but that absence does not prove the functions are stubs, their return values, or whether another mechanism is used. This audit did not invoke clipboard access because it is environment-affecting. Linux clipboard behavior and other-platform implementations therefore remain open native questions.

## Recovery script

```sh
# (re)generate the .node files into ./claude-code-pkg/
node scripts/extract-claude-code-final-artifacts.mjs --refresh-package
# inspect
file claude-code-pkg/image-processor.node
readelf -d claude-code-pkg/image-processor.node | grep NEEDED
nm -D --undefined-only claude-code-pkg/image-processor.node | grep -c napi_
strings -n 6 claude-code-pkg/image-processor.node | grep -E "^[a-z][a-z0-9_-]+-[0-9]+\.[0-9]+\.[0-9]+/" | sed 's|/.*||' | sort -u
```

The third line confirms the unique N-API import count (43); the fourth recovers the full crate set with versions.

## Caveats

- This page works only from the Linux-x64 binary; macOS and Windows builds were not inspected, so export parity and clipboard behavior are unknown.
- Internal Rust function layout is not recovered. Panic-location paths, imports, exports, and runtime observations identify artifact content but not full native control flow.
- Crate-version strings and the rustc commit identify linked build inputs; they do not prove every linked codec or async path is reachable.

## Related docs

- [Audio capture and voice mode](audio-capture-and-voice.md) — the audio-side counterpart with a similar Rust + N-API shape.
- [Media native modules](media-native-modules.md) — the older shim-level inventory; this page is the deep analysis it pointed to as future work.
- [`cli.renamed.js` overview](../00-start-here/what-is-cli-js.md)
- [Operations and native-support architecture](architecture.md)
