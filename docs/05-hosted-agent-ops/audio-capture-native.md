# Audio capture native module

This page is the artifact-level reverse-engineering writeup of `audio-capture.node`, the Bun-embedded addon that exposes recording and playback functions. It is the companion page to [Audio capture and voice mode](audio-capture-and-voice.md): that page documents the source-confirmed recording consumer and JS state machine; this page inventories the exact Linux-x64 binary boundary. No readable Claude Code call site for the playback wrappers was found, so playback is an exported capability rather than a confirmed active product path.

The `.node` binary is regenerated locally by [`scripts/extract-claude-code-final-artifacts.mjs`](../../scripts/extract-claude-code-final-artifacts.mjs) and is held outside git via `*.node` in [`.gitignore`](../../.gitignore). This page works off the linux-x64 build of `@anthropic-ai/claude-code@2.1.215`.

## ELF metadata

| Item | Value |
|---|---|
| Path | [`claude-code-pkg/audio-capture.node`](../../claude-code-pkg/audio-capture.node) |
| Type | ELF 64-bit LSB shared object, x86-64, dynamically linked, **stripped** |
| Size | 492,184 bytes (481 KiB) |
| SHA-256 | `185f990044394fbd4811284cfe9812d261453571c4dfbfa27dadd299c53036eb` |
| Bun graph path | `/$bunfs/root/audio-capture.node` |
| Defined dynamic symbol | `napi_register_module_v1` (single export) |

## ABI surface

| Layer | Evidence |
|---|---|
| Dynamic library deps (`readelf -d`) | `libasound.so.2`, `libpthread.so.0`, `libc.so.6`, `libdl.so.2`, `ld-linux-x86-64.so.2` — **ALSA is linked dynamically; no PulseAudio, PipeWire, JACK, Wayland, CoreAudio, or WASAPI** dependencies are present. |
| Minimum glibc | `GLIBC_2.17` (same floor as `image-processor.node`). |
| ALSA symbol versions used | `ALSA_0.9` (base) and `ALSA_0.9.0rc4` / `ALSA_0.9.0rc8` (for `*_set_period_time_near`, `*_set_buffer_time_near`, `*_get_*_min/max`, `*_status_get_htstamp`, `*_status_get_trigger_htstamp`). |
| Rust toolchain | Same rustc commit `01f6ddf7588f42ae2d7eb0a2f21d44e8e96674cf` as the image addon. |
| N-API imports | 36 undefined `napi_*`. Notable absences: **no `napi_create_promise` / `napi_resolve_deferred` / `napi_reject_deferred`**. Threadsafe-function imports are present. This constrains the ABI shape, but does not by itself recover when callbacks are queued or how worker threads are managed. |

## Source provenance — statically linked Rust crates

Recovered from panic-location source paths in `.rodata`:

| crate | Version | Role |
|---|---|---|
| `napi` | 2.16.17 | napi-rs binding layer (function / class / threadsafe-fn / external buffer). |
| `cpal` | 0.15.3 | Cross-Platform Audio Library — the only audio API the addon talks to from Rust. |
| `alsa` | 0.9.1 | Rust ALSA FFI bindings, the Linux backend that `cpal` delegates to. |
| `once_cell` | 1.21.3 | Lazy/global storage support; the concrete values stored are not recovered here. |

The recovered `cpal-0.15.3` source paths include `src/host/alsa/mod.rs`, `src/lib.rs`, and `src/traits.rs`; the recovered `alsa-0.9.1` paths include `src/pcm.rs` and `src/poll.rs`. No CoreAudio, WASAPI, JACK, or Oboe paths or corresponding system libraries were observed in this Linux artifact. That classifies this build, not the implementation of packages for other operating systems.

`addr2line` / `gimli` / `hashbrown` / `rustc-demangle` are present too but only service Rust panic backtraces; they are not part of the audio pipeline.

**Implication**: the artifact contains a focused napi-rs/cpal/ALSA dependency surface. Dependency presence does not establish the addon's exact stream lifecycle or the composition of uninspected macOS and Windows packages.

## ALSA surface

The undefined-symbol list has 49 distinct `snd_pcm_*` entries spanning PCM setup, I/O, status, recovery, and polling:

```text
open / close / prepare / start / pause / recover / status / avail / bytes_to_frames
readi / writei                              ← capture and playback I/O
hw_params{,_any,_malloc,_free}
hw_params_set_{access,format,channels,rate,buffer_size,buffer_time_near,
              period_size_near,period_time_near}
hw_params_get_{rate_{min,max},channels_{min,max},buffer_size_{min,max}}
hw_params_test_{format,channels,rate}        ← parameter probing
hw_params_can_pause                          ← capability check
sw_params{,_current,_malloc,_free}
sw_params_set_{avail_min,start_threshold,tstamp_mode,tstamp_type}
poll_descriptors{,_count,_revents}           ← event-driven wakeup
status / status_sizeof / status_get_{delay,htstamp,trigger_htstamp}
```

Two bounded takeaways:

- Both direction-specific imports are present: `snd_pcm_readi` and `snd_pcm_writei`. This is consistent with the recording and playback exports.
- Parameter-test, min/max, recovery, and poll imports show that linked code can use those ALSA operations. An import table does not prove which functions execute for a given device, in what order, or before which JS callback.

## JavaScript surface

### Module exports (registered by `napi_register_module_v1`)

Recovered exactly from `Failed to register function \`…\`` error strings:

| Rust name | JS name | Purpose |
|---|---|---|
| `start_recording` | `startRecording(...)` | Recording entry; readable CLI wrappers pass chunk and completion callbacks. |
| `stop_recording` | `stopRecording()` | Recording stop entry. |
| `is_recording` | `isRecording()` → `bool` | Recording-state query; returned `false` while inert in the exact-artifact probe. |
| `start_playback` | `startPlayback(...)` | Playback entry; exported, but no downstream readable CLI consumer was found. |
| `write_playback_data` | `writePlaybackData(buffer)` | Playback-data entry; exported, but no downstream readable CLI consumer was found. |
| `stop_playback` | `stopPlayback()` | Playback stop entry; exported, but no downstream readable CLI consumer was found. |
| `is_playing` | `isPlaying()` → `bool` | Playback-state query; returned `false` while inert in the exact-artifact probe. |
| `microphone_authorization_status` | `microphoneAuthorizationStatus()` → number | Numeric authorization query. The inspected Linux-x64 artifact returned `3`; the semantic enum mapping and other-platform behavior are not established by this binary. |

No class is exposed — the eight functions hold the entire surface. The `napi_define_class` import slot exists but stays unused on this build (likely a side-effect of napi-rs's macro template; the strings `Failed to register class \`` / `Failed to register export \`` are emitted but no class name follows them in `.rodata`).

### Call path from `cli.renamed.js`

The bundle wrapper at [cli.renamed.js#L95](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L95) loads the addon via `require("/$bunfs/root/audio-capture.node")` (see the shim at [`claude-code-pkg/audio-capture.js`](../../claude-code-pkg/audio-capture.js)). The voice runtime exposes `isNativeAudioAvailable()` around [line 562780](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L562780); the `audio-capture-napi loaded in Xms` log at [line 562844](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L562844) follows the first successful lazy load.

The runtime path (covered fully in [Audio capture and voice mode](audio-capture-and-voice.md)) selects this addon before `arecord` / SoX `rec` when the addon loads and `/proc/asound/cards` reports a sound card. The readable call sites consume the recording wrappers. Searches for the playback wrapper names found their definitions/exports but no downstream CLI playback call site.

## Concurrency evidence and limit

The binary imports N-API threadsafe-function calls and ALSA poll functions, while no Tokio crate path was observed. This is consistent with native work communicating asynchronously with JS callbacks, but the stripped binary has not been disassembled. The available evidence does **not** prove:

- one dedicated thread per stream;
- which component owns or schedules that thread;
- whether every ALSA wait uses poll descriptors;
- whether `snd_pcm_recover` runs before a callback;
- whether fatal N-API imports are reachable for a device-disconnect case;
- exact stop, drain, release, or callback ordering.

## Defensive / error surfaces

Recovered Rust-side error categories:

| Category | Source string (excerpt) |
|---|---|
| ALSA wrapping | `Audio capture error:`, `Audio playback error:`, `host supplied incorrect sample type`, `chunk size must be non-zero`, `capacity overflow` |
| cpal stream invariants | `\`capture\` is earlier than representation supported by \`StreamInstant\``, `\`playback\` occurs beyond representation supported by \`StreamInstant\``, `stream duration has exceeded \`StreamInstant\` representation` |
| Poll-loop sanity check | `expected input stream, but polling descriptors indicated output` |
| Internal invariant | `assertion failed: unsafe { alsa::snd_pcm_status_sizeof() } as usize <= STATUS_SIZE` (cpal asserts that the ABI-fixed `snd_pcm_status_t` fits its inline buffer) |
| Borrow-check at runtime | `..RefCell already borrowed` (cpal stream-state contention) |

These strings and imports identify possible error categories, not a recovered propagation graph. The readable voice code surfaces capture/start or stream failures as `voiceError`; backend fallback is selected before recording, and no automatic post-start native-to-recorder handoff is established.

## Microphone authorization observation

The JS wrapper forwards the native return value without translating it. A safe runtime probe of this exact `@anthropic-ai/claude-code@2.1.215` Linux-x64 artifact returned `3` from `microphoneAuthorizationStatus()`.

That observation corrects the earlier claim that Linux always returns `0`, but it does not prove what `3` means internally. A familiar four-value authorization enum would map `3` to “authorized,” yet no readable native implementation or platform contract was recovered, so that mapping remains a hypothesis. The JS wrapper itself returns `0` only when the addon is unavailable.

## Recovery script

```sh
# regenerate the .node files
node scripts/extract-claude-code-final-artifacts.mjs --refresh-package
# inspect
file claude-code-pkg/audio-capture.node
readelf -d claude-code-pkg/audio-capture.node | grep NEEDED
nm -D --undefined-only claude-code-pkg/audio-capture.node | grep -c snd_pcm_   # → 49
nm -D --undefined-only claude-code-pkg/audio-capture.node | grep -c napi_      # → 36
strings -n 6 claude-code-pkg/audio-capture.node | grep -E "^[a-z][a-z0-9_-]+-[0-9]+\.[0-9]+\.[0-9]+/" | sed 's|/.*||' | sort -u
# expected: alsa-0.9.1, cpal-0.15.3, napi-2.16.17, once_cell-1.21.3
```

## Caveats

- This page works only from the Linux-x64 artifact. It makes no claim that another platform has the same dependencies, export behavior, or authorization result.
- The `.text` section is not disassembled. Panic-location paths, imports, exports, and runtime observations are strong artifact evidence, but they do not recover native function bodies or lifecycle order.
- Crate-version strings identify code linked into the artifact; they do not prove every linked path is reached during Claude Code voice capture.

## Related docs

- [Audio capture and voice mode](audio-capture-and-voice.md) — JS-side state machine, recorder fallback chain, transcription stream.
- [Image processor native module](image-processor-native.md) — companion deep-dive on the image addon (different shape: tokio + Promise-based, no system libraries linked).
- [Media native modules](media-native-modules.md) — shim-level inventory and SHA-256 catalog.
- [`cli.renamed.js` overview](../00-start-here/what-is-cli-js.md)
- [Operations and native-support architecture](architecture.md)
