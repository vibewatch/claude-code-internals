# Image processor native module

This page is a binary-level reverse-engineering writeup of `image-processor.node`, the Bun-embedded native addon that backs Claude Code's image pipeline (paste / drag-drop / image attachment resize and re-encode). It is the image-side counterpart of [Audio capture and voice mode](audio-capture-and-voice.md).

The `.node` binary is regenerated locally by [`scripts/extract-claude-code-final-artifacts.mjs`](../../scripts/extract-claude-code-final-artifacts.mjs) (now in the final-keep allow-list) and is held outside git via `*.node` in [`.gitignore`](../../.gitignore). This page works off the linux-x64 build of `@anthropic-ai/claude-code@2.1.143`.

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
| N-API surface | 40 undefined `napi_*` imports: `napi_create_threadsafe_function`, `napi_define_class`, `napi_create_promise`, `napi_resolve_deferred`, `napi_reject_deferred`, `napi_create_external_buffer`, `napi_create_buffer`, `napi_create_function`, `napi_get_cb_info`, full property / reference / typeof / coercion helpers. |

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
| `tokio` | 1.50.0 | Async runtime that backs napi-rs `AsyncTask` (decode / encode run off the Node main loop). |
| `once_cell` | 1.21.4 | Lazily-initialised globals (constructor reference, module singleton). |

`addr2line-0.25.1` / `gimli-0.32.3` / `hashbrown-0.16.1` / `rustc-demangle-0.1.26` are present too but only service Rust panic backtraces; they are not part of the image pipeline.

**Implication**: this is *not* a `sharp` / `libvips` binding. It is a direct napi-rs wrapper around the Rust `image` ecosystem, deliberately keeping the deployment surface to a single 1.4 MiB binary with zero external `.so` dependencies. The trade-off is format coverage: PNG / JPEG / WebP are supported end-to-end; GIF / TIFF / BMP / AVIF / HEIF appear as enum strings (`ftypavif`, `Gif`, `Tiff`, `Bmp`, `Hdr`, `Pnm`) but **no decoder crate is linked** for them, so they fail with `Unable to determine image format`.

## JavaScript surface

### Module exports (registered by `napi_register_module_v1`)

Recovered from error strings such as `Failed to register function \`process_image\`` / `\`has_clipboard_image\`` / `\`read_clipboard_image\`` and `Failed to construct class \`ImageProcessor\``:

| Export | Kind | Linux behaviour |
|---|---|---|
| `processImage(input)` | async standalone fn | Returns a `Promise<ImageProcessor>` resolved on a tokio worker. |
| `hasClipboardImage()` | sync standalone fn | Stub on Linux — no X11 / Wayland deps are linked, so it returns `false`. |
| `readClipboardImage()` | sync standalone fn | Stub on Linux — throws / returns nothing for the same reason. |
| `ImageProcessor` (class) | `napi_define_class` | Instance methods exposed below; one-shot, `dispose`-after-consume. |

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

Once `toBuffer()` or `dispose()` runs, further calls trigger the runtime error `ImageProcessor already consumed (toBuffer/dispose was called)`.

### Call path from `cli.renamed.js`

The JS-side façade [`sharp()` at cli.renamed.js#L201822](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L201822) buffers `resize` / `jpeg` / `png` / `webp` calls into a closure queue, then on `toBuffer()` awaits `processImage(input)` and replays the queue. This makes the napi-rs mutable pipeline look like sharp's fluent API — Claude Code only uses `metadata` / `resize` / `jpeg` / `png` / `webp` / `toBuffer`.

The shim that brings the addon into the bundle is the Bun CJS wrapper at [`claude-code-pkg/image-processor.js`](../../claude-code-pkg/image-processor.js); it is the JS half of the `require("/$bunfs/root/image-processor.node")` bridge.

## Concurrency model

- `tokio-1.50.0` is statically linked and used as napi-rs's `AsyncTask` executor.
- The threadsafe-function imports (`napi_create_threadsafe_function`, `napi_call_threadsafe_function`, `napi_release_threadsafe_function`) carry the decode / encode result back to the Node event loop via `napi_resolve_deferred` / `napi_reject_deferred`.
- Error strings `Panic in async function`, `Failed to initialize napi function call`, and `Resolve deferred value failed` mark the Rust → JS boundary failure paths.
- CPU-bound decoding therefore does not block the Node main loop; the JS `await processImage(buf)` returns once the worker has produced an `ImageProcessor` handle, and `await .toBuffer()` later runs the configured pipeline on the worker again.

## Defensive limits and error surfaces

| Guard | Source string (excerpt) | Meaning |
|---|---|---|
| Dimension caps | `Image width N greater than width limit M`, `Image height N greater than height limit M`, `Image size exceeds limit`, `width and height must be >= 1 and <= 65535` | `image::Limits` is enabled with non-trivial bounds; rejects oversize inputs without allocating. |
| Memory budget | `MemoryLimitExceeded` | Decoder allocates against a `Limits.max_alloc` and fails fast. |
| Decompression budget | `Out of decompression space. Try with a larger limit.` | PNG zlib bomb defence. |
| Stream integrity | `Corrupt deflate stream`, `CrcMismatch`, `BadZlibHeader`, `DistanceTooFarBack`, `WrongChecksum`, `Invalid PNG signature.`, `Invalid WebP signature:` | Both `fdeflate` and `miniz_oxide` reject malformed inputs; the encoders refuse to write with `can't write indexed image without palette`, `the dimension and position go over the frame boundaries`, etc. |
| Metadata caps | `ICC profile too large`, `Unable to compress text metadata`, `The text metadata cannot be encoded into valid ISO 8859-1` | PNG tEXt / iCCP guards. |
| JPEG feature gating | `The library cannot yet decode images encoded using Extended Sequential Huffman encoding scheme yet.`, `… Lossless Huffman …`, `… Extended Sequential DCT Arithmetic …`, `… Progressive DCT Arithmetic …`, `… Lossless Arithmetic …` | `zune-jpeg` is the baseline / progressive Huffman path only — uncommon JPEG variants surface explicit errors instead of crashing. |

## Clipboard story

The `has_clipboard_image` / `read_clipboard_image` registrations are present in every build, but the Linux native module ships them as stubs:

- No `libX11` / `libwayland-client` / `arboard` / `copypasta` symbols are linked.
- The only `dlsym` / `dl_iterate_phdr` usage comes from Rust's `addr2line` + `gimli` backtrace plumbing — not a lazy clipboard backend.
- The expectation is that the macOS and Windows native packages carry real implementations (NSPasteboard / `OpenClipboard`) while Linux falls through to a `false` / `Err` return.

If you want clipboard images on Linux, the runtime path is `xclip` / `wl-paste` invoked from JS, not this addon.

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

The third line confirms the N-API import count (40); the fourth recovers the full crate set with versions.

## Caveats

- This page works off the linux-x64 binary; macOS and Windows builds are not analysed here. The N-API export list and JS surface should match, but the clipboard backends likely differ.
- Internal Rust function layout is not recovered. The page treats panic-location source paths as ground truth (they are emitted by the Rust compiler from real source) but does not disassemble the `.text` section. Deeper analysis would feed the binary to Ghidra / IDA, follow `napi_register_module_v1` to the `napi_define_class` call, and reverse the property-setter table to recover the exact `resize` / `jpeg` / `png` / `webp` argument parsing (default quality, kernel choice, …).
- Crate versions above are exact because Rust embeds them verbatim into panic locations; the rustc commit (`01f6ddf7…`) is similarly authoritative.

## Related docs

- [Audio capture and voice mode](audio-capture-and-voice.md) — the audio-side counterpart with a similar Rust + N-API shape.
- [Media native modules](media-native-modules.md) — the older shim-level inventory; this page is the deep analysis it pointed to as future work.
- [`cli.renamed.js` overview](../00-start-here/what-is-cli-js.md)
- [Operations and native-support architecture](architecture.md)
