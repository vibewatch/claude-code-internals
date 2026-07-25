# Operations and native support

This chapter covers operational surfaces that sit around the main local agent runtime: debug logs, telemetry/traffic policy, updater/doctor and safe-mode recovery paths, crash/error reporting, cloud/hosted review signals, and embedded native media helpers. The directory retains its historical `05-hosted-agent-ops` route for link stability; the reader-facing title reflects the chapter's broader actual scope.

Read this chapter when the question is: **how does Claude Code report, diagnose, update, or support host/native capabilities around a session?**

## Source-anchor policy

This page is a chapter guide. Linked implementation pages carry concrete `cli.renamed.js` or Bun-graph anchors.

| Semantic alias | Minified anchor | Scope |
|---|---|---|
| Ops chapter | N/A — navigation page | Groups diagnostics, telemetry, update, crash/debug logs, hosted review signals, and native media modules. |
| Ops implementation pages | See linked source-anchor tables | Concrete anchors live in destination pages. |

## Ops map

```mermaid
flowchart TD
    Runtime[Claude Code runtime] --> Debug[Debug logs]
    Runtime --> Telemetry[Telemetry / traffic gates]
    Runtime --> Update[Doctor / native updater]
    Runtime --> Hosted[Hosted review and remote ops]
    Runtime --> Media[Image/audio native modules]
    Debug --> Support[diagnosis]
    Telemetry --> Support
    Update --> Support
    Media --> Attachments[media/input support]
```

## Primary reading order

| Order | Page | Ops question answered |
|---:|---|---|
| 1 | [Diagnostics and debug logs](diagnostics-and-debug-logs.md) | Which debug flags/writers, user-triggered `/debug` evidence flow, hidden `/heapdump`, startup marks, stall diagnostics, and crash/error surfaces exist? |
| 2 | [Telemetry and tracing](telemetry-and-tracing.md) | Which traffic gates, telemetry sinks, `tengu_*` signal families, OTEL config, and trace export paths exist? |
| 3 | [Feature gates reference](feature-gates-reference.md) | Which GrowthBook, `tengu_*`, env, policy, settings, and CLI gates switch runtime behavior? |
| 4 | [Updater and doctor](updater-and-doctor.md) | How do `doctor`, `update`/`upgrade`, `install`, native auto-updater state, and hosted preflights work? |
| 5 | [Safe mode and recovery](safe-mode-and-recovery.md) | How does configuration isolation suppress user/project customizations while preserving managed policy, auth, built-ins, and permissions? |
| 6 | [Environment variables reference](environment-variables-reference.md) | Which auth, provider, debug, telemetry, feature, MCP, plugin, agent, remote, UI, and update env vars are visible? |
| 7 | [Media native modules](media-native-modules.md) | Which non-`cli.js` graph modules are embedded, and how are image/audio native helpers loaded? |
| 8 | [Audio capture and voice mode](audio-capture-and-voice.md) | How does `/voice` use local audio capture, recorder fallbacks, a transcription stream, and transcript injection? |
| 9 | [Audio capture native module](audio-capture-native.md) | Which Rust crates (`cpal`/`alsa`), ALSA PCM surface, and N-API exports ship inside `audio-capture.node`? |
| 10 | [Image processor native module](image-processor-native.md) | Which Rust crates / N-API exports / defensive limits ship inside `image-processor.node`, and how is it wired into the `sharp()`-shaped JS facade? |
| 11 | [Operations and native-support architecture](architecture.md) | How does the ops periphery (debug, telemetry, updater, doctor, native helpers) sit around the runtime without entering the inner loop? |

## Handoffs

- Custom prompt and agent-row status-line execution is documented in [Status line runtime and command protocol](../03-tools-integrations-security/status-line.md).
- Remote Control/session tokens are documented in [Sessions, persistence, and remote](../04-sessions-persistence-remote/README.md).
- Agents and hosted review command surfaces are documented in [Agents and automation](../06-agents-automation/README.md).
- Terminal accessibility rendering is documented in [Accessibility and screen-reader mode](../01-runtime-lifecycle/accessibility-and-screen-reader-mode.md).
- Protocol boundaries for voice streams and remote/provider transports are documented in [Runtime communication protocols](../00-start-here/runtime-communication-protocols.md).

## Navigation

- [Start here](../00-start-here/README.md)
- [Full table of contents](../SUMMARY.md)
