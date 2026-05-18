# Audio capture native module

This page is the binary-level reverse-engineering writeup of `audio-capture.node`, the Bun-embedded Rust addon that powers Claude Code's voice mode capture / playback path. It is the companion page to [Audio capture and voice mode](audio-capture-and-voice.md) — that page documents the JS-side state machine; this page documents what actually lives inside the `.node` shared object.

The `.node` binary is regenerated locally by [`scripts/extract-claude-code-final-artifacts.mjs`](../../scripts/extract-claude-code-final-artifacts.mjs) and is held outside git via `*.node` in [`.gitignore`](../../.gitignore). This page works off the linux-x64 build of `@anthropic-ai/claude-code@2.1.143`.

## ELF metadata

| Item | Value |
|---|---|
| Path | [`claude-code-pkg/audio-capture.node`](../../claude-code-pkg/audio-capture.node) |
| Type | ELF 64-bit LSB shared object, x86-64, dynamically linked, **stripped** |
| Size | 492,184 bytes (481 KiB) |
| SHA-256 | `7e89edf4dde9b69b6c55a310788ad999e2d0dd469d8a31c529cf28f3ea5e929c` |
| Bun graph path | `/$bunfs/root/audio-capture.node` |
| Defined dynamic symbol | `napi_register_module_v1` (single export) |

## ABI surface

| Layer | Evidence |
|---|---|
| Dynamic library deps (`readelf -d`) | `libasound.so.2`, `libpthread.so.0`, `libc.so.6`, `libdl.so.2`, `ld-linux-x86-64.so.2` — **ALSA is linked dynamically; no PulseAudio, PipeWire, JACK, Wayland, CoreAudio, or WASAPI** dependencies are present. |
| Minimum glibc | `GLIBC_2.17` (same floor as `image-processor.node`). |
| ALSA symbol versions used | `ALSA_0.9` (base) and `ALSA_0.9.0rc4` / `ALSA_0.9.0rc8` (for `*_set_period_time_near`, `*_set_buffer_time_near`, `*_get_*_min/max`, `*_status_get_htstamp`, `*_status_get_trigger_htstamp`). |
| Rust toolchain | Same rustc commit `01f6ddf7588f42ae2d7eb0a2f21d44e8e96674cf` as the image addon. |
| N-API imports | 36 undefined `napi_*`. Notable absences: **no `napi_create_promise` / `napi_resolve_deferred` / `napi_reject_deferred`** — the JS surface is purely synchronous-or-callback, not Promise-based. Present: `napi_create_threadsafe_function`, `napi_call_threadsafe_function`, `napi_release_threadsafe_function` for streaming PCM data back to JS. |

## Source provenance — statically linked Rust crates

Recovered from panic-location source paths in `.rodata`:

| crate | Version | Role |
|---|---|---|
| `napi` | 2.16.17 | napi-rs binding layer (function / class / threadsafe-fn / external buffer). |
| `cpal` | 0.15.3 | Cross-Platform Audio Library — the only audio API the addon talks to from Rust. |
| `alsa` | 0.9.1 | Rust ALSA FFI bindings, the Linux backend that `cpal` delegates to. |
| `once_cell` | 1.21.3 | Global singletons (host handle, stream registry). |

`cpal` is feature-trimmed to the ALSA backend only — the recovered source paths from `cpal-0.15.3` are exactly `src/host/alsa/mod.rs`, `src/lib.rs`, `src/traits.rs`. No `host/coreaudio/`, `host/wasapi/`, `host/jack/`, or `host/oboe/` modules are linked, which matches the absence of those system libraries from `readelf -d`. The recovered `alsa-0.9.1` files are `src/pcm.rs` and `src/poll.rs` — the PCM-only subset.

`addr2line` / `gimli` / `hashbrown` / `rustc-demangle` are present too but only service Rust panic backtraces; they are not part of the audio pipeline.

**Implication**: the addon is a focused cpal-over-ALSA wrapper exposed via napi-rs. macOS and Windows native packages presumably share the same Rust code with cpal's `coreaudio` / `wasapi` features enabled instead.

## ALSA surface

The undefined-symbol list has 49 distinct `snd_pcm_*` entries — effectively the full PCM lifecycle:

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

Two takeaways:

- Both directions are supported: `snd_pcm_readi` (capture) + `snd_pcm_writei` (playback). This matches the JS export pair `startRecording` / `startPlayback`.
- The presence of `*_test_*` and the `*_get_*_min/max` calls means cpal probes the device's supported parameter ranges before committing — that is how voice-mode survives strange hardware (e.g. WSL's `arecord` device which advertises a narrow rate window).

## JavaScript surface

### Module exports (registered by `napi_register_module_v1`)

Recovered exactly from `Failed to register function \`…\`` error strings:

| Rust name | JS name | Purpose |
|---|---|---|
| `start_recording` | `startRecording(onChunk, onSilence)` | Open capture PCM, start streaming `Buffer`s back through `napi_call_threadsafe_function`. |
| `stop_recording` | `stopRecording()` | Drain and close the capture PCM. |
| `is_recording` | `isRecording()` → `bool` | True if a capture stream is active. |
| `start_playback` | `startPlayback(onUnderrun, onFinish)` | Open playback PCM. |
| `write_playback_data` | `writePlaybackData(buffer)` | Push PCM bytes into the playback ring. |
| `stop_playback` | `stopPlayback()` | Drain and close the playback PCM. |
| `is_playing` | `isPlaying()` → `bool` | True if a playback stream is active. |
| `microphone_authorization_status` | `microphoneAuthorizationStatus()` → number | macOS-shaped permission status (`0` NotDetermined / `1` Restricted / `2` Denied / `3` Authorized). On Linux always returns `0` because ALSA has no permission model. |

No class is exposed — the eight functions hold the entire surface. The `napi_define_class` import slot exists but stays unused on this build (likely a side-effect of napi-rs's macro template; the strings `Failed to register class \`` / `Failed to register export \`` are emitted but no class name follows them in `.rodata`).

### Call path from `cli.renamed.js`

The JS wrapper at [cli.renamed.js#L611651](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611651) loads the addon via `require("/$bunfs/root/audio-capture.node")` (see the shim at [`claude-code-pkg/audio-capture.js`](../../claude-code-pkg/audio-capture.js)) and re-exports the eight functions one-to-one, plus a JS-side `isNativeAudioAvailable()` helper that returns `true` if the addon loaded and the addon's `isRecording` symbol resolves. The `audio-capture-napi loaded in Xms` log line at [cli.renamed.js#L611740](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611740) is emitted after the first successful `RP8()` lazy-load.

The runtime path (covered fully in [Audio capture and voice mode](audio-capture-and-voice.md)) prefers this addon over `arecord` / SoX `rec` when both the addon loads and `/proc/asound/cards` reports a working sound card.

## Concurrency model

- No `tokio` is statically linked (unlike `image-processor.node`). Audio I/O blocks happen on cpal's own internal thread; cpal spawns a dedicated worker thread per stream and calls into ALSA's `poll_descriptors` to wait for capture frames.
- Streaming back to JS uses `napi_create_threadsafe_function` + `napi_call_threadsafe_function` — the Rust capture thread enqueues each frame onto the JS event loop without blocking it.
- Errors marshalled via `napi_fatal_error` / `napi_fatal_exception` for unrecoverable cases (e.g. ALSA device disappearing mid-stream); recoverable underrun / overrun is handled with `snd_pcm_recover` before the chunk callback fires.

## Defensive / error surfaces

Recovered Rust-side error categories:

| Category | Source string (excerpt) |
|---|---|
| ALSA wrapping | `Audio capture error:`, `Audio playback error:`, `host supplied incorrect sample type`, `chunk size must be non-zero`, `capacity overflow` |
| cpal stream invariants | `\`capture\` is earlier than representation supported by \`StreamInstant\``, `\`playback\` occurs beyond representation supported by \`StreamInstant\``, `stream duration has exceeded \`StreamInstant\` representation` |
| Poll-loop sanity check | `expected input stream, but polling descriptors indicated output` |
| Internal invariant | `assertion failed: unsafe { alsa::snd_pcm_status_sizeof() } as usize <= STATUS_SIZE` (cpal asserts that the ABI-fixed `snd_pcm_status_t` fits its inline buffer) |
| Borrow-check at runtime | `..RefCell already borrowed` (cpal stream-state contention) |

The error path that propagates back to JS lights up `Audio capture error:` / `Audio playback error:` plus the underlying ALSA reason. The voice-mode UI then surfaces it as `voiceError` and falls back to the `arecord` / SoX path.

## Microphone authorization on Linux

`microphoneAuthorizationStatus` is the same N-API export shape on every platform, but the Linux build never returns anything other than `0`:

- The Linux backend has no permission API to query — ALSA simply tries to open the device and fails if denied (e.g. permissions on `/dev/snd/*`).
- This matches the JS wrapper at [cli.renamed.js#L611715](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L611715) which simply forwards whatever the native fn returns; the voice UI uses a non-zero value only to skip the system permission prompt that would otherwise show on macOS.

macOS and Windows native packages presumably implement a real permission probe via the system APIs (`AVCaptureDevice authorizationStatus` / `IAudioCaptureClient` permission flag).

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

- This page works off the linux-x64 binary. macOS and Windows builds presumably reuse the same Rust source with different cpal host backends (`coreaudio`, `wasapi`); the JS-visible export list should match but `microphoneAuthorizationStatus` will return real values.
- The `.text` section is not disassembled. The page treats panic-location source paths and N-API registration error strings as ground truth (they are emitted by the Rust compiler from real source) without reverse-engineering the function bodies themselves. Deeper analysis would feed the binary to Ghidra / IDA and recover the exact PCM parameters (sample rate, format, period size) cpal chooses for capture and playback.
- Crate versions are exact because Rust embeds them verbatim into panic locations.

## Related docs

- [Audio capture and voice mode](audio-capture-and-voice.md) — JS-side state machine, recorder fallback chain, transcription stream.
- [Image processor native module](image-processor-native.md) — companion deep-dive on the image addon (different shape: tokio + Promise-based, no system libraries linked).
- [Media native modules](media-native-modules.md) — shim-level inventory and SHA-256 catalog.
- [`cli.renamed.js` overview](../00-start-here/what-is-cli-js.md)
- [Operations and native-support architecture](architecture.md)
