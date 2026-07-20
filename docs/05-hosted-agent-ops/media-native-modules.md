# Media native modules

This page is the shim-level inventory for the two non-`cli.js` JavaScript stubs retained from the Bun standalone payload and the native addons they reference. The `.node` binaries are now extracted alongside their JS shims by [`scripts/extract-claude-code-final-artifacts.mjs`](../../scripts/extract-claude-code-final-artifacts.mjs); they are kept out of git via `*.node` in [`.gitignore`](../../.gitignore). Detailed binary-level reverse engineering lives in [Audio capture and voice mode](audio-capture-and-voice.md) and [Image processor native module](image-processor-native.md).

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| ImageProcessorShim | `require("/$bunfs/root/image-processor.node")` | CommonJS wrapper loads image native addon from the original Bun payload path. |
| AudioCaptureShim | `require("/$bunfs/root/audio-capture.node")` | CommonJS wrapper loads audio native addon from the original Bun payload path. |
| AudioNapiLoadedLog | `audio-capture-napi loaded` | Main runtime attempts to load the audio N-API addon for voice capture. |
| VoiceTranscriptInjection | `Injecting transcript` | Voice transcription result is injected back into the prompt input. |
| NativeElfClassification | `ELF 64-bit LSB shared object, x86-64, ... stripped` | Both `.node` modules are stripped Linux x86-64 shared objects. |
| NativeNapiRegistration | `napi_register_module_v1` | Both native addons expose the N-API module registration symbol. |
| NativeNapiImports | `U napi_create_*`, `U napi_call_*`, `U napi_get_*` | Dynamic imports confirm Node-API/N-API interaction, not readable implementation internals. |

## Module inventory

| Module | Bytes | SHA-256 | Role |
|---|---:|---|---|
| `image-processor.js` | 2,171 | `cdda6dcabf12ffd0f558e922fd268b3c21f92a6b869f806510338c25c51492ef` | `2.1.215` JS shim requiring `image-processor.node`. |
| `audio-capture.js` | 2,169 | `3d6b83c97b7cf53692407e85053262a1cffca44af3697bb0f5b46c18c500b420` | `2.1.215` JS shim requiring `audio-capture.node`. |
| `image-processor.node` | 1,464,760 | `37bec7de530676e3dfe963d34a824b49191595809a8072348a2ef4571f1e5f4d` | Stripped N-API image module. Statically links Rust `image-0.25.10` / `png-0.18.1` / `image-webp-0.2.4` / `zune-jpeg-0.5.13`; fully analysed in [Image processor native module](image-processor-native.md). |
| `audio-capture.node` | 492,184 | `185f990044394fbd4811284cfe9812d261453571c4dfbfa27dadd299c53036eb` | Stripped N-API audio capture / playback module. Statically links Rust `cpal-0.15.3` + `alsa-0.9.1`; runtime path documented in [Audio capture and voice mode](audio-capture-and-voice.md), binary-level analysis in [Audio capture native module](audio-capture-native.md). |

## Interpretation

The two retained JavaScript files are straightforward Bun CommonJS shims. They do not implement media logic directly; each immediately requires its matching `.node` shared object from the original Bun payload. The native modules are regenerated locally and gitignored, so this repository treats them as binary support modules rather than ordinary tracked source.

The likely runtime boundary is media input support: the names indicate image processing and audio capture. The audio path is now source-confirmed in `cli.renamed.js`: voice mode loads the native capture addon when available, falls back to OS recorders, streams audio for transcription, and injects the final transcript into the prompt input. See [Audio capture and voice mode](audio-capture-and-voice.md) for that runtime path.

## Native binary triage status

The current binary inspection is enough to classify the modules but not to reconstruct their internals.

| Check | Result | Interpretation |
|---|---|---|
| `file image-processor.node` / `file audio-capture.node` | `ELF 64-bit LSB shared object, x86-64, dynamically linked, stripped` | The modules are Linux shared objects without normal symbolic debug names. |
| `nm -D --defined-only` | `napi_register_module_v1` in both modules | The public dynamic export is the Node-API registration function. |
| `nm -D` imports | Numerous `napi_*` imports such as `napi_create_function`, `napi_create_object`, `napi_call_threadsafe_function` | Runtime interaction is through N-API; function/class names inside the addon are not exposed by these imports. |

Future native reverse engineering would require re-extracting the native `.node` files temporarily from the package, then using runtime observation or binary tooling rather than treating the `.node` files as JavaScript-adjacent source. Useful next questions are which N-API exports are registered, which OS audio/image libraries are linked, and how failures propagate back to the JavaScript shims.

The image addon's questions are now answered in [Image processor native module](image-processor-native.md) (linked Rust crates, JS surface, defensive limits, clipboard story). The audio addon's native-side analysis lives in [Audio capture native module](audio-capture-native.md) (cpal + ALSA bindings, 49-function PCM surface, microphone-authorization stub).

## Caveats

- Both native addons are now reverse-engineered end-to-end (see [Image processor native module](image-processor-native.md) and [Audio capture native module](audio-capture-native.md)).

## Related docs

- [Image processor native module](image-processor-native.md)
- [Audio capture native module](audio-capture-native.md)
- [Audio capture and voice mode](audio-capture-and-voice.md)
- [`cli.renamed.js` overview](../00-start-here/what-is-cli-js.md)
- [Diagnostics and debug logs](diagnostics-and-debug-logs.md)
