# SDK query, session API, and subagent surface

This page documents the `claude-code-pkg/src/entrypoints/cli.renamed.js` module that exposes Claude Code as a programmatic SDK: the `query` async-iterator, the session management API, the subagent inspection API, the SDK MCP server helper, and the direct-connect transport. External SDK consumers (such as `@anthropic-ai/claude-agent-sdk`) re-export the same surface from this module.

Use this page together with:

- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md) for the print/`-p`/stream-JSON CLI path that wraps the same `query` function.
- [Session resume and transcripts](session-resume-and-transcripts.md) for the on-disk transcript format the SDK reads and writes.
- [Session API, events, and storage](session-api-events-and-storage.md) for the runtime state hub the SDK calls into.
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) for the agent runtime the SDK schedules.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| SdkQueryEntry | `function query({ prompt, options })` | Main SDK entry that opens a Claude Code subprocess, drives it, and exposes an async-iterable transport. |
| SdkStartup | `async function startup({ options, initializeTimeoutMs = 60000 } = {})` | Pre-warms the subprocess, runs initialization, returns a one-shot `WarmQuery` with `query()`, `close()`, and `Symbol.asyncDispose`. |
| SdkResolveSettings | `async function resolveSettings(H)` | Returns the merged settings the runtime would apply for the given options, without starting the loop. |
| SdkMcpServerFactory | `function createSdkMcpServer(H)` | Builds an in-process MCP server from JavaScript tool callbacks so SDK callers do not need a separate process. |
| DirectConnectTransport | `class DirectConnectTransport` | Bridge/Remote-Control transport for connecting an SDK client directly to an existing Claude Code session. |
| DirectConnectError | `class DirectConnectError extends Error` | Error type raised by the direct-connect transport. |
| DirectConnectUrlParser | `function parseDirectConnectUrl(H)` | Parses `cc://` / `cc+unix://` URLs into a transport descriptor. |
| InMemorySessionStore | `class InMemorySessionStore` | Session store implementation that keeps transcripts in memory instead of on disk; used by tests and headless callers that opt out of persistence. |
| SessionApi | `listSessions`, `getSessionInfo`, `getSessionMessages` | Read-only API over the configured session store. |
| SessionMutationApi | `renameSession`, `tagSession`, `deleteSession`, `forkSession`, `importSessionToStore` | Mutations over the configured session store. |
| TranscriptFoldHelper | `foldSessionSummary` | Returns a folded transcript summary suitable for resume/picker UI. |
| SubagentInspectionApi | `listSubagents`, `getSubagentMessages` | Read-only API over the subagent transcripts produced by the Task tool family. |
| SdkToolDefiner | `function tool(...)` | Type-safe SDK helper for defining a Claude Code tool with Zod input/output schemas. |
| HookEventsConstant | `HOOK_EVENTS` | SDK-exported list of hook event names (mirrors the runtime list in [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md)). |
| ExitReasonsConstant | `EXIT_REASONS` | SDK-exported list of conversation exit reasons. |
| SystemPromptDynamicBoundary | `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` | Sentinel string separating stable/dynamic system-prompt sections (see [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)). |
| EscalatingDefaultModeFilter | `filterEscalatingDefaultMode` | Filters permission-mode escalations so the SDK does not surface escalations that are blocked by policy. |
| SdkAbortError | `class AbortError extends Error` | SDK-exported abort error used by `query` cancellation. |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `SdkQueryAndSessionApi` | 605109 | `query`, `startup`, `resolveSettings`, `tool`, `createSdkMcpServer`, `parseDirectConnectUrl`, `DirectConnectTransport`, `DirectConnectError`, `InMemorySessionStore`, `HOOK_EVENTS`, `EXIT_REASONS`, `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, `filterEscalatingDefaultMode`, `foldSessionSummary`, `importSessionToStore`, `forkSession`, `deleteSession`, `tagSession`, `renameSession`, `getSessionMessages`, `getSessionInfo`, `listSessions`, `getSubagentMessages`, `listSubagents`, `AbortError` | [Bundle module map — session, transcript, agent metadata, and teammate IPC](../99-research-atlas/module-map-from-renamed-cli.md#session-transcript-agent-metadata-and-teammate-ipc) |

## SDK surface map

```mermaid
flowchart TD
    Caller[SDK consumer / external program] --> Query[query]
    Caller --> Startup[startup]
    Caller --> SessionApi[Session API]
    Caller --> SubagentApi[Subagent API]
    Caller --> McpHelper[createSdkMcpServer]
    Caller --> DirectConnect[parseDirectConnectUrl + DirectConnectTransport]

    Query --> Subprocess[Spawn / attach Claude Code subprocess]
    Startup --> WarmSubprocess[Pre-warm subprocess + initializationResult]
    Subprocess --> Transport[(query stream / control frames)]
    WarmSubprocess --> WarmQuery[WarmQuery wrapper<br/>query(), close(), Symbol.asyncDispose]
    WarmQuery --> Subprocess

    SessionApi --> Store{configured session store}
    SubagentApi --> Store
    SessionMutation[renameSession / tagSession / forkSession / deleteSession / importSessionToStore] --> Store
    Store -->|sessionStore option| InMem[InMemorySessionStore]
    Store -->|default| LocalDisk[Local JSONL transcripts]

    McpHelper --> McpServer[In-process MCP server bound to JS callbacks]
    DirectConnect --> Bridge[Bridge / Remote Control client]
```

## Core entry points

### `query({ prompt, options })`

`query` is the SDK's primary async-iterable surface. It accepts a prompt (string or an async-iterable of input messages) and an options bag, opens a Claude Code subprocess with the right transport and abort controller, and returns an iterator that yields the same stream-JSON frames documented in [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md).

Key options the SDK accepts:

- `cwd`, `dir`, `env` — process identity for the subprocess.
- `resume`, `forkSession`, `loadTimeoutMs`, `sessionStore` — control how the session is restored, including using an [`InMemorySessionStore`](#in-memory-session-store) instead of disk.
- `model`, `fallbackModel`, `permissionMode`, `allowedTools`, `disallowedTools`, `mcpServers`, `agents`, `hooks`, `outputStyle`, `appendSystemPrompt` — same shape as the corresponding root flags in [Commands and flags](../01-runtime-lifecycle/commands-and-flags.md).
- `signal`, `abortController` — cancellation. Triggers a `SdkAbortError`.

### `startup({ options, initializeTimeoutMs }) -> WarmQuery`

`startup` pre-warms a subprocess: it runs `initializationResult()` to wait for full SDK startup, then returns a `WarmQuery` wrapper exposing exactly one `.query(input)` call plus `.close()` and `Symbol.asyncDispose`. The wrapper guards against re-use and ensures cleanup callbacks run even if `query()` throws.

### `resolveSettings(options) -> ResolvedSettings`

Returns the same settings object the runtime would apply, without spawning the loop. Used by SDK callers that need to inspect the effective configuration (model selection, MCP server roster, permission rules) before deciding whether to start a session.

## Session API

| Function | Behavior |
| --- | --- |
| `listSessions(options)` | Lists sessions from `options.sessionStore` when provided, otherwise falls back to the on-disk local-jsonl store. |
| `getSessionInfo(id, options)` | Returns session metadata (title, tags, model, agent name, transcript path). |
| `getSessionMessages(id, options)` | Returns the message history; uses the configured session store. |
| `renameSession(id, newName, options)` | Updates the stored session title; persists to disk when using the default store. |
| `tagSession(id, tags, options)` | Updates session tags. |
| `deleteSession(id, options)` | Removes the session from the configured store. |
| `forkSession(id, options)` | Creates a new session that branches from the existing transcript at the resume point. |
| `importSessionToStore(payload, store)` | Imports an external session transcript into an `InMemorySessionStore` or similar. |
| `foldSessionSummary(messages)` | Returns a folded summary suitable for resume/search UI. |

All mutating functions accept an `options.sessionStore` to redirect from the default local-jsonl store. See [Session resume and transcripts](session-resume-and-transcripts.md) and [Session API, events, and storage](session-api-events-and-storage.md) for the underlying behavior.

### In-memory session store

`InMemorySessionStore` is exported so SDK callers can pass a `sessionStore` option without touching disk. Tests and short-lived headless callers use this to avoid leaving transcript files behind.

## Subagent inspection API

| Function | Behavior |
| --- | --- |
| `listSubagents(sessionId, options)` | Lists subagent IDs produced by the Task tool family for a given parent session. |
| `getSubagentMessages(sessionId, subagentId, options)` | Returns the subagent's transcript filtered to user/assistant messages. |

These read the subagent transcripts off the same on-disk layout described in [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md). They are inspection APIs; they do not spawn subagents.

## SDK MCP server helper

`createSdkMcpServer(options)` builds an in-process MCP server backed by JavaScript callbacks. SDK callers can register tools with `tool(...)` (which uses Zod schemas) without launching a separate MCP process. The result is the same MCP server interface documented in [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md), so the runtime's MCP coordinator treats it identically to a stdio/socket-backed server.

## Direct-connect transport

`parseDirectConnectUrl` accepts `cc://host:port` or `cc+unix:///socket/path` URLs and returns a transport descriptor. `DirectConnectTransport` then opens a duplex stream to that endpoint, letting SDK callers attach to a Claude Code Remote Control session instead of spawning their own subprocess. Failures throw `DirectConnectError`. See [Remote control and teleport](remote-control-and-teleport.md) for the Remote Control side.

## Exported constants

| Constant | Use |
| --- | --- |
| `HOOK_EVENTS` | Canonical hook-event list mirrored from the runtime; SDK consumers iterate it to register handlers. |
| `EXIT_REASONS` | Canonical exit-reason list returned in the final stream frame. |
| `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` | Sentinel separating stable from dynamic system-prompt sections; SDK callers that postprocess prompts split on this. |

## Safe interpretation rules

- This module is the SDK's public surface; the actual subprocess is still the bundled `cli.renamed.js` runtime. The SDK does not bypass permission rules, hooks, or remote-control gates.
- `query` always opens a fresh subprocess; reuse the same `WarmQuery` only inside one logical conversation. `startup` is designed for one-shot use.
- Mutating session APIs operate on whichever `sessionStore` the caller passes; without one they touch the local-jsonl transcript directory. Always pass an explicit store in tests.
- The direct-connect transport requires Remote Control to be enabled on the target session; failures are surfaced as `DirectConnectError` and should be retried rather than swallowed.

## Related docs

- [Headless streaming and resilience](../02-context-model-loop/headless-streaming-and-resilience.md)
- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Session API, events, and storage](session-api-events-and-storage.md)
- [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
- [Bundle module map](../99-research-atlas/module-map-from-renamed-cli.md)
