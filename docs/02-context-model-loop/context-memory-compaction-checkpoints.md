# Context, memory, compaction, checkpoints, and rewind

This page reverse-engineers how `cli.renamed.js` manages model-visible context and memory, how conversation compaction works, and which checkpoint/rewind surfaces are source-confirmed.

Scope: local/project/managed/auto memory, context accounting, manual and automatic compaction, compaction hooks, transcript context-collapse state, file checkpoints, interactive `/rewind` (aliases `/checkpoint` and `/undo`), and headless `--rewind-files`. `/undo` is a name for the rewind selector, not a separate general-purpose inverse-operation engine.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| ManagedMemoryInjection | `CLAUDE.md-style instructions injected as organization-managed memory` | Managed/policy memory can inject `CLAUDE.md`-style instructions. |
| MemoryScopeResolver | `User`, `Local`, `Project`, `Managed`, `AutoMem` in `getMemoryPath` | Memory path resolver for global, local, project, managed, and auto-memory scopes. |
| ProjectRuleMemoryLoader | `.claude/rules`, `CLAUDE.local.md` | Project/local rule and memory loading path. |
| AutoMemoryNormalizer | `qAg()` → `N4r(content)`, `VAg()` | Auto-memory content is normalized before becoming memory context. |
| DynamicPromptBoundary | `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | Runtime distinguishes stable and dynamic system-prompt sections. |
| PromptCacheMetadataGuard | `cache_control` | Prompt-cache metadata is stripped/hardened for hashing/accounting paths. |
| MemoryRelevanceRequest | `Izy()`, `Select memories relevant to:` | Structured memory-file selector using the default Sonnet model without the normal system prefix. |
| AutoCompactSetting | `autoCompactEnabled` | User setting: automatically compact when context fills. |
| AutoCompactUserExplanation | `Auto-compact summarizes the conversation when context usage approaches this limit` | User-visible `/autocompact` explanation. |
| AutoCompactGate | `wWg()`, `autocompact()`, `AWg()` | Model-aware threshold check, auto-compaction routing, and fixed-prefix overflow detection. |
| CompactionHookLifecycle | `PreCompact`, `PostCompact` | Hook lifecycle around compaction. |
| PreCompactHookSchema | `PreCompact`, `trigger`, `custom_instructions` | Hook schema for manual/auto compaction and hook-provided instructions. |
| PostCompactSummaryHook | `compact_summary` | `PostCompact` hook receives the produced summary. |
| FullCompaction | `rlo()` | Full automatic summary path, including hooks, retries, boundary creation, and refreshed attachments. In this build it is used by the normal automatic route and in-process teammate history compaction, not by `/compact`. |
| PartialCompaction | `YMu()` | Message-selector compaction in `from` or `up_to` direction while preserving the opposite segment. |
| ReactiveCompaction | `flo()` / `XTy()` → `Bas()` → `ilo()` → `hlo()` | Grouped retrying summary and result materialization for automatic immediate-pressure or manual command routes. |
| PrecomputedCompaction | `Ras()` → `ilo()`, then `Das()` / `JTy()` → `hlo()` | Background arm and later automatic swap or manual consume path. |
| ManualCompactRouter | `XTy()` → `JTy()` / `Bas()` → `hlo()` | `/compact` runs a manual hook pass, reuses a compatible ready precompute when possible, and otherwise uses grouped reactive summarization [~499,359–499,529](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L499359). |
| CompactSummaryContract | `Jao()`, `cWg()`, `J9r()` | One-turn, no-tool, no-transcript/cache-write summary request and the continuation message built from its `<summary>` output [~346,360–346,700](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L346360). |
| CompactCacheSharing | `JMu()`, `tengu_compact_cache_sharing_success` | Full/partial summarization first tries a one-turn fork that can reuse the conversation's cache-safe prefix; invalid/no-text/error results fall back to a direct non-caching summary call [~347,443–347,650](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L347443). |
| CompactMediaPlaceholder | `J5g()`, `fas()` | Summary-request copies replace rich media with exact text placeholders without rewriting the source transcript [~346,673–346,746](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L346673). |
| CompactResultSplice | `E.type === "compact"`, `jVe()` | Local-command dispatch appends command/display records to the retained suffix and returns the compacted chain without another model turn [~351,953–351,974](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L351953). |
| PrecomputedSidecar | `Qrr()`, `oOu()`, `iOu()`, `.precompact.json` | Versioned, size-bounded persistence for a ready main-session precompute. |
| PreservedMessageMetadata | `gas()`, `preservedMessages`, `preservedSegment` | Current explicit preserved-UUID metadata and its legacy contiguous-segment compatibility form. |
| TranscriptCompactionRelink | `dOd()`, `_8y()`, `buildConversationChain()` | Resume-time preserved-message relinking and conversation-chain reconstruction. |
| CompactionSummaryFailure | `Failed to generate conversation summary` | Full compaction failure when no valid summary is returned. |
| PartialCompactionFailure | `tengu_partial_compact_failed` | Partial compaction failure path. |
| ContextLowWarning | `Context low ... Run /compact to compact & continue` | TUI context-low warning and manual compaction prompt. |
| ContextUsageCommand | `collectContextData()`, `GQr()` | TUI/text `/context` implementations collect category, MCP, agent, memory, and skill estimates [~502,648–502,670](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L502648). |
| ManualCompactCommand | `name: "compact"`, `XTy()`, `JTy()` | `/compact` runs hooks and can reuse a ready precomputed result [~499,350–499,620](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L499350). |
| AutoCompactWindowCommand | `name: "autocompact"`, `applyAutoCompactWindow()` | Reads/writes the effective auto-compact window with env/model precedence [~499,650–499,740](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L499650). |
| ContextCollapseState | `contextCollapseCommits`, `contextCollapseSnapshot` | Context-collapse state is persisted/restored with session state. |
| FileCheckpointSetting | `fileCheckpointingEnabled` | File snapshot setting used by `/rewind`. |
| FileHistoryRewind | `FileHistory: [Rewind] Rewinding to snapshot` | File rewind implementation applies a tracked snapshot. |
| InteractiveRewindCommand | `name: "rewind"`, `aliases: ["checkpoint", "undo"]`, `open_message_selector` | Opens the interactive code/conversation restoration selector [~560,096](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L560096). |
| HeadlessRewindGuard | `Error: --rewind-files requires --resume` | Headless rewind guard. |
| RewindSuccessFrame | `Files rewound to state at message` | `--rewind-files` success path. |

## Runtime context model

`cli.renamed.js` treats context as layered runtime state, not as one static prompt string.

```mermaid
flowchart TD
    Files[CLAUDE.md / CLAUDE.local.md / .claude/rules] --> Memory[Memory entries]
    Managed[Managed claudeMd policy] --> Memory
    Auto[AutoMem] --> Memory
    Settings[Settings / output styles / tools / MCP / agents] --> Context[Context assembler]
    Memory --> Selector[Relevant-memory file selection]
    Auto --> Normalize[AutoMem normalization]
    Normalize --> Context
    Selector --> Context
    Transcript[Session transcript and tool results] --> Context
    Context --> Budget[Context accounting]
    Budget --> Compact{Compact needed?}
    Compact -->|no| Request[Provider request]
    Compact -->|yes| Summary[Compaction summary]
    Summary --> Request
```

The main memory families are:

| Memory family | Source-confirmed roots | Runtime role |
|---|---|---|
| User/global memory | `CLAUDE.md` under the user config root | Private instructions across projects. |
| Project memory | project `CLAUDE.md`, project `.claude/rules` | Checked-in or project-scoped instructions. |
| Local memory | `CLAUDE.local.md` | Private project instructions, gated by local-settings support. |
| Managed memory | managed/policy `CLAUDE.md` or `claudeMd` setting | Organization-managed instructions that ordinary user/project excludes cannot remove. |
| Auto memory | `getMemoryPath("AutoMem")`, normalized by `N4r()` in `qAg()`/`VAg()` | Persistent auto-memory across conversations. |

The memory loader can exclude user/project/local files with configured glob patterns, but the schema text explicitly says managed/policy files cannot be excluded through that mechanism.

## Memory selection is not memory compression

`Izy()` issues a dedicated helper request beginning `Select memories relevant to:`. It uses the default Sonnet model, sets `skipSystemPromptPrefix: true`, caps output at 256 tokens, and requires a JSON object containing `selected_memories`. Returned names are filtered against the candidate filename map, with the selector prompt asking for at most five clearly useful memories. This is a separate request, not a normal conversation turn with the full default system prompt.

The current source does normalize AutoMem content through `N4r()` before injection, but no enclosing implementation for a separate `Extract facts relevant to:` request was confirmed in this build. This page therefore does not treat fact extraction as a current, independent model-call mechanism.

This is different from compaction:

| Mechanism | What it changes | What it does not imply |
|---|---|---|
| Memory selection | Chooses relevant memory files for the current prompt. | Does not rewrite the whole transcript or prove a separate fact-extraction pass. |
| AutoMem normalization | Cleans/normalizes auto-memory content before use. | Does not prove every memory file is summarized. |
| Context compaction | Summarizes conversation history so the agent can continue inside the context window. | Does not mean `CLAUDE.md` files themselves are compressed. |

So “memory compression” in this build is best described as **conversation/context compaction plus memory re-selection**, not as an in-place compression of memory files.

## Context accounting and auto-compact thresholds

Context accounting uses model-aware token/window logic. The visible surfaces include:

- `autoCompactEnabled`: persistent setting, defaulted on in global config.
- `autoCompactWindow`: configurable window size.
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW`: environment override surfaced by `/autocompact` UI.
- `DISABLE_COMPACT` and `DISABLE_AUTO_COMPACT`: environment kill switches.
- UI text such as `Context low (...) · Run /compact to compact & continue`.

### `/context`, `/compact`, and `/autocompact`

The three commands expose different layers of this subsystem:

| Command | What it reads or changes |
|---|---|
| `/context [all]` | Collects a current estimate and renders a colored grid in the TUI. The non-interactive twin emits Markdown tables for model/window totals, category estimates, MCP tools, custom agents, memory files, and skill frontmatter. It can also account for built-in/deferred tools and system-prompt sections. This is a measurement request, not a compaction trigger. |
| `/compact [instructions]` | Normalizes the current live chain, refuses an ended or empty conversation, runs `PreCompact(trigger:"manual")`, and applies a grouped reactive result. With no custom/hook instructions it may consume a ready precomputed summary at the exact retained boundary; custom instructions or hook-added instructions force a fresh grouped summary. It does not call `rlo()` in `2.1.215`. |
| `/autocompact` | Reports the configured/effective window, its source, model cap, and whether automatic compaction is enabled. |
| `/autocompact auto` or `100k`–`1m` | Writes `autoCompactWindow` to user settings (`reset`, `unset`, and `default` mean `auto`), then emits `apply_flag_settings` so a host/bridge can synchronize it. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` has higher precedence and makes the command report that the persisted value is currently shadowed. |

`/context` values remain estimates: individual token-count helper calls can fail and fall back, dynamic/deferred content can change before the next model request, and remote/provider-side accounting is not reconstructed by this view. `/autocompact` similarly reports the minimum of the configured window and the current model's maximum rather than promising one universal trigger count.

`wWg(...)` computes the current model-aware estimate (minus any supplied token credit), evaluates it against the effective window, logs `autocompact: tokens=<n> level=<level> effectiveWindow=<n>`, and returns true for `compact` or `blocked` levels. `autocompact(...)` then applies feature, query-source, failure-breaker, and rapid-refill gates before choosing a full or reactive route. `AWg(...)` separately detects a fixed cached prefix that is already larger than the threshold, because summarizing transcript messages cannot make that prefix smaller.

## Full, partial, reactive, and precomputed compaction

Compaction has several source-confirmed execution shapes. “Automatic” is a trigger, while “full,” “partial,” and “reactive” describe how the replacement is produced. A precomputed result is an optimization of the reactive shape rather than a different transcript format.

| Variant | Trigger | Confirmed anchors | Behavior |
|---|---|---|---|
| Full | Normal automatic route when reactive routing does not apply; in-process teammate history above its threshold | `rlo()` | Summarizes the conversation, emits a compact boundary plus a transcript-only summary message, and rebuilds current attachments. The retained implementation supports manual/auto telemetry parameters, but no manual `/compact` caller reaches it in this build. |
| Partial | Message-selector operation with direction `from` or `up_to` | `YMu()` | Summarizes one side of a selected index, keeps the other side, and records preservation metadata so the retained messages can be reconstructed. Optional user feedback is folded into summary instructions. |
| Reactive | Manual `/compact`; an eligible automatic threshold/prompt-too-long recovery route | `XTy()`, `flo()`, `Bas()`, `ilo()`, `hlo()` | Summarizes older normalized conversation groups while retaining a suffix. It can increase the retained suffix across retries rather than repeatedly sending the same oversized prefix. |
| Precomputed | Background arm before immediate recovery is required; later automatic or manual reuse | `Ras()`, `Das()`, `JTy()` | Runs the grouped reactive summarizer ahead of time. At consumption the runtime validates the boundary, appends messages created since precompute to the retained suffix, and materializes the result through `hlo()`. |

`autocompact(...)` can call `rlo()` directly or route through `flo()` depending on the effective threshold source and runtime mode. Therefore “auto compact” must not be read as an alias for only the full summarizer. Conversely, the user-facing `/compact` command is not the current full-path caller: it uses the grouped reactive materializer, with optional precompute reuse.

### Exact manual `/compact` call path

```mermaid
flowchart TD
    Command[/compact optional instructions/] --> Guard[YTy: normalize live chain; reject ended or empty]
    Guard --> Prepare[XTy: run manual PreCompact and build cache-safe request parameters]
    Prepare --> Merge[merge user and hook-provided instructions]
    Merge --> Reuse{no instructions and compatible ready precompute?}
    Reuse -->|yes| Materialize[hlo materializes ready result]
    Reuse -->|no| Group[Bas → ilo groups turns and preserves a recent suffix]
    Group --> Summary[cWg: one-turn no-tool summary fork]
    Summary --> Materialize
    Materialize --> Result[type: compact]
    Result --> Dispatch[local-command dispatcher adds command/display records and returns jVe chain]
```

The entry has four distinct phases:

1. `YTy()` rejects a conversation already ended by the model, normalizes the live chain with `lS()`, rejects an empty chain, and treats the remaining command text as custom summary instructions.
2. `XTy()` runs `PreCompact(trigger:"manual")` in parallel with `ZTy()`'s reconstruction of cache-safe system/user/system context. User instructions and `newCustomInstructions` from the hook are concatenated.
3. `JTy()` permits reuse only when neither source supplied instructions. It consumes a ready precompute, verifies that `precomputedAtUuid` remains in the current chain, and preserves every non-progress message after that boundary. A miss calls `Bas()` → `ilo()`; the latter groups normalized turns, initially preserves the newest group, and progressively preserves more groups after prompt-too-long failures.
4. `hlo()` creates the compact boundary, summary message, explicit preserved-UUID metadata, rebuilt attachments, and `PostCompact` result. The local-command dispatcher then appends the `/compact` command record and visible `Compacted ...` output to `messagesToKeep`, flattens the result with `jVe()`, and returns `shouldQuery:false`. Compaction itself therefore performs a helper model request, but it does not launch a second ordinary assistant turn afterward.

The helper request is deliberately constrained: `cWg()` invokes a one-turn fork with every tool denied, transcript and prompt-cache writes disabled, and `querySource:"compact"`. `Jao()` requires plain text containing `<analysis>` followed by `<summary>` and asks the helper to preserve user intent, technical decisions, files/code, errors/fixes, all genuine user messages, pending/current work, next-step context, and security constraints. Optional `/compact` instructions are appended to this prompt. `J9r()` strips the analysis block, turns the summary into a continuation message, includes the transcript path when available, and tells the main agent to resume without recapping.

### Cache sharing versus cache writes

The full and partial summarizers call `JMu()`, which has two request shapes:

1. When `tengu_compact_cache_prefix` is enabled and non-essential content is not being stripped, `runForkedAgent()` sends only the summary instruction as the fork's new prompt message while carrying the caller's cache-safe parameters. The fork permits no tools, runs at most one turn, writes neither transcript nor prompt cache, and may read/reuse the existing conversation prefix. A valid assistant text result returns immediately. `tengu_compact_cache_sharing_success` records `preCompactTokenCount`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, a cache-hit ratio whose denominator also includes ordinary input tokens, and `forkAssistantMessageCount`; it does not emit ordinary input tokens as a separate event field.
2. If the fork throws or returns no valid non-error text, `JMu()` records `tengu_compact_cache_sharing_fallback` and calls the model directly with a short summarizer system prompt. That direct request explicitly sets `enablePromptCaching:false`, uses no MCP tools, and streams only the summary response. Abort remains terminal rather than being converted into fallback work.

Prompt-too-long text from a valid fork is returned to the caller rather than classified as a cache-sharing failure. Full/partial retry logic then shortens the fork context and calls `JMu()` again. The source exposes the helper request's usage counters, but it does not establish a separate user-visible billing rule for “compaction tokens”; this page therefore does not infer one.

### Hook lifecycle

Hook timing differs slightly by path:

1. Full `rlo()` and partial `YMu()` run `PreCompact` immediately before their summary request. `PreCompact` receives `trigger: "manual" | "auto"` and nullable `custom_instructions`.
2. A hook can block compaction through `blockedBy` or extend the summary request through `newCustomInstructions`.
3. Automatic non-precomputed reactive compaction runs `PreCompact` in `flo()`, summarizes through `Bas()`/`ilo()`, and materializes through `hlo()`. Manual `XTy()` owns the equivalent manual hook pass before entering `Bas()`.
4. Precomputed compaction runs `PreCompact(trigger:"auto")` when `Ras()` arms the background job. A blocked result is never made ready. Automatic `Das()`/`flo()` consumption carries the stored hook display text and does not rerun `PreCompact` at swap time. Manual `/compact` is different: `XTy()` always runs a new `PreCompact(trigger:"manual")` pass before `JTy()` considers reuse, and any new hook instructions force a fresh grouped summary.
5. Successful paths run `PostCompact` only when the result is materialized. It receives `compact_summary`; for precompute this occurs when `hlo()` applies the ready result, not when the background summary first becomes ready.

```mermaid
sequenceDiagram
    participant ModelLoop as Model loop
    participant Hooks as Hook runner
    participant Model as Summary model request
    participant State as Context/session state

    ModelLoop->>Hooks: PreCompact(trigger, custom_instructions)
    alt hook blocks
        Hooks-->>ModelLoop: blockedBy
        ModelLoop-->>State: keep existing context
    else hook allows
        Hooks-->>ModelLoop: newCustomInstructions?
        ModelLoop->>Model: summarize conversation/context
        Model-->>ModelLoop: compact summary
        ModelLoop->>State: replace/collapse older context
        ModelLoop->>Hooks: PostCompact(compact_summary)
    end
```

### Reactive grouping and retry behavior

`ilo()` first removes progress-only noise and groups the conversation into turn-like units. It begins by preserving the newest group and asking a one-turn forked summarizer to summarize the older prefix. On a prompt-too-long result it preserves more trailing groups:

- when the error supplies a token gap, the next step estimates how many additional groups cover that gap;
- without a parseable gap, it advances one group;
- a media-too-large result repeats the same logical split once with media represented by text placeholders; the retry does not consume another group-preservation attempt;
- aborts and ordinary API errors stop the attempt rather than silently applying a partial result;
- the routine fails when fewer than two groups exist, no assistant message is in the summary prefix, or every possible split is exhausted.

A successful grouped result contains the summary text/messages, the exact messages to preserve, attempt count, group counts, fork usage, and assistant-message count. `hlo()` turns that result into the normal boundary/summary/attachment shape. Preserved assistant messages keep their content but have historical usage counters zeroed before reinsertion so the retained suffix is not reported as fresh model usage.

`fas()` performs the media transformation on the summary-request copy, not on the original transcript or retained suffix:

| Rich-content location | Summary copy |
|---|---|
| User or queued-command image block | text block `[image]` |
| User or queued-command document block | text block `[document]` |
| Image/document nested in a tool result | corresponding text block inside the same tool result |
| File attachment with `content.type:"image"` | one-line text-file attachment containing `[image]` |
| File attachment with `content.type:"notebook"` | one-line text-file attachment containing `[notebook]` |
| File attachment with `content.type:"parts"` | one-line text-file attachment containing `[parts]` |

Reactive `cWg()` first sends the unmodified summary prefix. Only a provider `media_too_large` response makes `ilo()` repeat it with `fas()` enabled; a second media-size result becomes `media_unstrippable`. The direct fallback inside full/partial `JMu()` applies `fas()` before its non-caching request, because the cache-sharing fork has already had the opportunity to consume the richer prefix.

### Precomputed result state and sidecar

`Ras()` stores an in-memory entry keyed by the main session or agent key with `pending`, `ready`, or `failed` state. `Das()` consumes a result at threshold or eligible withheld-413 recovery. It waits for an in-flight entry when necessary, rejects a ready result if its `precomputedAtUuid` boundary no longer exists, and otherwise returns both the precomputed summary and all non-progress messages added after that boundary.

For the eligible main-session path, a ready result can also be written beside the transcript as `<session>.precompact.json`. The retained schema is version `1`, is capped at **8,000,000 bytes**, and includes:

| Field group | Retained values |
|---|---|
| Identity | `version`, `sessionId`, `agentKey: "main"`, `model`, `cliVersion` |
| Timing/boundary | `createdAt`, `precomputedAtUuid`, `preCompactTokens`, `readyDurationMs` |
| Hook/summary | optional `preCompactHookDisplay`, `summaryText`, non-empty `summaryMessages` |
| Preservation | `preserveUuids` |
| Retry/usage | `attempt`, `groupsPreserved`, `totalGroups`, `forkAssistantMessageCount`, `totalUsage` |

The reader rejects malformed, oversized, unparseable, non-version-1 sidecars before rehydration. Rehydration then requires all of the following:

- the current session ID and model exactly match;
- the timestamp parses and is no more than seven days old;
- `precomputedAtUuid` still exists in the transcript;
- context has not grown by more than 150,000 estimated tokens;
- context has not shrunk by more than half of `preCompactTokens`;
- every `preserveUuids` entry still resolves to a current message.

The retained `cliVersion` is logged as a match/mismatch signal but is **not** itself a rejection condition in this build. A rejected sidecar is scheduled for deletion. Consumption, explicit discard, post-compaction cleanup, and applicable session/agent teardown also remove or abort the entry and clean up its sidecar. Persistence failure merely leaves the in-memory ready result available; it does not invalidate the completed summary.

### What compaction rebuilds afterward

After a valid summary, full, partial, and reactive materialization clear transient read/memory-selection state: `readFileState`, `loadedNestedMemoryPaths`, and the `memorySelector`. `nlo()` then builds a current post-compaction attachment set rather than copying every old attachment verbatim. Depending on current state it can restore bounded recent file attachments, task status, a plan reference and plan-mode reminder, invoked skills, deferred-tool deltas, agent-listing deltas, MCP-instruction deltas, and `SessionStart` hook results for the `compact` source.

The recent-file restore is itself bounded: at most five files, at most 5,000 tokens per generated file attachment, and at most 50,000 estimated tokens across those attachments. This is the key design point: compaction is not only “summarize old messages.” It also reconstructs a bounded, current non-message context surface for the next provider request.

### Boundary metadata and transcript reconstruction

Materialized partial/reactive results call `gas()` to annotate the compact boundary. Current metadata records an explicit `preservedMessages` object:

```text
{
    anchorUuid,
    uuids,      // cleaned/loggable preserved messages
    allUuids    // full preserved input before logging cleanup
}
```

When there are cleaned preserved messages, the boundary also carries the older contiguous `preservedSegment` form (`headUuid`, `anchorUuid`, `tailUuid`) for compatibility. Current resume logic prefers the explicit list.

On transcript load, `dOd()` only relinks preserved history when the latest compact boundary has usable preservation metadata. For `preservedMessages`, it verifies that every listed UUID exists, chains those messages after `anchorUuid`, zeros retained assistant usage counters, removes older non-preserved pre-boundary messages, and repairs children that pointed into the removed segment. If only the legacy `preservedSegment` exists, `_8y()` walks parent links from `tailUuid` back to `headUuid`; it accepts the segment only if the walk reaches the declared head without a cycle or missing link. A broken list/walk is logged and is not guessed into place.

The surrounding `buildConversationChain()` reconstruction then walks `parentUuid` from the selected leaf, stops and reports cycles, and can recover narrowly from missing links using same-sidechain timestamps. It also restores parallel assistant chunks sharing a provider message ID and their tool results. These repairs explain how preserved suffixes survive resume, but they do not make arbitrary unchained transcript records valid: records that cannot join the selected chain can still be dropped.

### Failure behavior

| Failure | Source-confirmed behavior |
|---|---|
| Full/partial prompt still too long | The summarizer can truncate older groups and retry up to three times; exhaustion raises the conversation-too-long failure instead of emitting an invalid boundary. |
| Reactive prompt still too long | `ilo()` increases the preserved suffix using a token-gap-guided or one-group step until a split works or all splits are exhausted. |
| Reactive media too large | Repeats the same split once with `[image]`, `[document]`, `[notebook]`, or `[parts]` as applicable; a second media failure becomes `media_unstrippable`. The original transcript is not rewritten. |
| No valid summary text | Throws `Failed to generate conversation summary - response did not contain valid text content`. |
| API error in summary call | Emits `tengu_compact_failed` / `tengu_partial_compact_failed` with `reason:"api_error"`. |
| Summary model unavailable | The summary request can advance through its availability fallback chain; a blocked model with no acceptable fallback surfaces a compaction error. |
| Hook blocks compaction | Full/partial compaction throws a hook-blocked error; reactive/precomputed compaction returns or clears the attempt without applying a replacement. |
| Repeated automatic failures | The automatic path opens a session circuit breaker after three consecutive failures; a separate rapid-refill breaker can stop repeated near-immediate compactions. |
| Invalid precompute sidecar | Rehydration is rejected and the sidecar is deleted asynchronously; normal compaction remains available. |
| Compaction disabled | UI shows context-low warnings and suggests `/clear` or manual trimming instead. |

## Checkpoint, rewind, and undo semantics

There are three separate “checkpoint-like” systems:

| State family | Source anchors | Purpose |
|---|---|---|
| Compaction transcript state | `compact_boundary`, `compactMetadata`, `preservedMessages` | Persists summary boundaries and enough preservation metadata for the active compacted conversation to be relinked on resume. |
| Context-collapse state | `marble-origami-commit`, `marble-origami-snapshot`, `marble-origami-reset` | Persists a separate context-collapse subsystem's commits/latest snapshot; a reset tombstone discards earlier retained collapse state. It is not the same record family as summary compaction. |
| File-history snapshots | `fileCheckpointingEnabled`, `fileHistorySnapshots`, `FileHistory: [Rewind]` | Snapshots edited files before changes so the user can restore the file tree to a prior user-message point. |

The transcript loader handles these independently. Compact boundaries affect which conversation messages survive and how preserved UUIDs are relinked. `marble-origami-*` records populate `contextCollapseCommits` and `contextCollapseSnapshot` without standing in for compact summaries. File-history snapshot/delta records reconstruct tracked-file backups for rewind without changing the provider-visible conversation.

`fileCheckpointingEnabled` is described as “Snapshot files before edits so /rewind can restore them.” The actual rewind implementation looks up the latest snapshot for a message ID and applies tracked backups. The headless `--rewind-files <user-message-id>` path validates that the target is a user message, performs the rewind, prints `Files rewound to state at message <id>`, and exits without running another model turn.

### Rewind is intentionally standalone

The headless runner rejects unsafe combinations before any model work:

| Guard | Runtime effect |
|---|---|
| `--rewind-files` without `--resume` | Exits with `Error: --rewind-files requires --resume`. |
| `--rewind-files` plus a prompt | Exits with `Error: --rewind-files is a standalone operation and cannot be used with a prompt`. |
| Target ID is not a user message | Exits with `Error: --rewind-files requires a user message UUID...`. |

This makes rewind a file-restore operation tied to a resumed transcript, not a prompt modifier.

### What does `/undo` mean?

The current core registry explicitly defines:

```text
name: "rewind"
aliases: ["checkpoint", "undo"]
```

Invoking any of those names calls the same local handler, which emits `open_message_selector` and skips a model turn. The selector can restore code, conversation state, or both to a selected point according to the available checkpoint/transcript state.

This confirms `/undo` as a **command alias**, but not as a separate universal undo engine. It does not synthesize inverse tool calls, reverse arbitrary remote effects, or promise that every filesystem operation has a checkpoint. The source-confirmed reversible families remain:

- resume/continue/branch at the session layer;
- context compaction/collapse at the prompt-history layer; and
- file checkpoint plus `/rewind`/`/checkpoint`/`/undo` or headless `--rewind-files` at the filesystem layer.

## Operational interpretation

The runtime manages continuity through three different persistence loops:

1. **Memory loop:** load `CLAUDE.md`/rules/managed/AutoMem, select relevant memories, and inject them into context.
2. **Context loop:** monitor token pressure, compact conversation history, persist compact boundaries/preserved UUIDs, and separately retain context-collapse records.
3. **Filesystem loop:** snapshot edited files and allow rewind to a previous user-message boundary.

These loops cooperate but do not collapse into one mechanism. A compaction summary can keep the conversation moving, while file rewind can restore disk state, and resume can rehydrate both kinds of state later.

## Caveats

- `cli.renamed.js` is bundled/minified; function names such as `rlo`, `YMu`, `ilo`, `Ras`, `Das`, `flo`, `Bas`, and `hlo` are version-specific search anchors, not public APIs.
- This page documents local runtime surfaces. Hosted/managed-agent server-side compaction appears in embedded SDK docs and event examples, but local CLI behavior is anchored separately above.
- Exact token thresholds are model- and setting-dependent; the source-confirmed behavior is the thresholding pipeline and user-visible controls, not one universal number.
- Sidecar validation proves only client-side reuse rules. It does not prove that every abrupt process exit leaves a reusable sidecar, or that other versions accept the same schema and thresholds.

## Related docs

- [Prompt, context, and memory](prompt-context-memory.md)
- [Models, providers, and auth](models-providers-auth.md)
- [Model selection, calls, usage, quota, and billing](model-selection-usage-quota-billing.md)
- [Headless streaming and resilience](headless-streaming-and-resilience.md)
- [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md)
- [MCP, plugins, and hooks](../03-tools-integrations-security/mcp-plugins-hooks.md)
