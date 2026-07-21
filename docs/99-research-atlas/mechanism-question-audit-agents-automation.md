# Mechanism-question audit: agents and automation

This ledger records the full-analysis reverse-engineering audit of the seven mechanism-oriented pages under `docs/06-agents-automation`. It records the reader questions used to test each page, source-confirmed answers, documentation decisions, and the boundary beyond which the retained artifacts do not support a claim.

## Scope and exclusions

Audited pages:

1. [`agent-runtime-scheduling-and-completion.md`](../06-agents-automation/agent-runtime-scheduling-and-completion.md)
2. [`agents-tasks-and-subagents.md`](../06-agents-automation/agents-tasks-and-subagents.md)
3. [`architecture.md`](../06-agents-automation/architecture.md)
4. [`cron-and-scheduled-tasks.md`](../06-agents-automation/cron-and-scheduled-tasks.md)
5. [`dynamic-workflows.md`](../06-agents-automation/dynamic-workflows.md)
6. [`observer-agents.md`](../06-agents-automation/observer-agents.md)
7. [`slash-commands-and-automation.md`](../06-agents-automation/slash-commands-and-automation.md)

Excluded from direct editing were the section `README.md`, shared navigation/indexes, extracted source artifacts, generated prompt catalogs and source atlases, other documentation sections, website configuration, and other audit ledgers. A page that already answered its source-answerable mechanism questions was intentionally left unchanged rather than churned.

## Artifact identity and evidence model

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code@2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Primary behavioral view | [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) — SHA-256 `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` |
| Normalized corroborating view | [`cli.formatted.js`](../../claude-code-pkg/src/entrypoints/cli.formatted.js) — SHA-256 `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` |
| Raw retained entrypoint | [`cli.js`](../../claude-code-pkg/src/entrypoints/cli.js) — SHA-256 `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` |
| Prompt discovery/corroboration | [`data/prompt-catalog.json`](data/prompt-catalog.json), generated from `cli.renamed.js`; not standalone runtime proof |
| Audit host | Linux x86-64 |

The three JavaScript files are views of one retained artifact, not independent implementations. Enclosing control flow in the semantic view established behavior; normalized/raw views corroborated transformed symbols and exact strings. The prompt catalog was used only to find or confirm model-visible contracts after runtime behavior was established. Existing docs supplied reader questions, not proof.

Approximate bundle lines are build-specific navigation aids. Exact strings/symbols and their enclosing branches are the durable evidence. Generated artifacts and `source-atlas/` were intentionally left untouched because the readable retained bundle supplied the required control flow.

## Question and convergence method

For each page:

1. Read the page and relevant neighboring docs.
2. Ask zero to ten genuine reader questions about identity, ordering, state, scheduling, failure, cancellation, persistence, cleanup, limits, and edge cases that the page did not answer clearly.
3. Trace each question through focused `cli.renamed.js` control flow and corroborate it in `cli.formatted.js`, raw `cli.js`, or the prompt catalog where useful.
4. Patch only source-confirmed omissions or incorrect values; preserve evidence limits.
5. Re-read the result and ask only new questions introduced or still unanswered.
6. Declare convergence only after a complete pass over all seven pages yields zero new source-answerable mechanism questions.

“Zero new questions” does not mean every implementation detail is known. It means remaining material questions require unavailable server/native code, runtime observation, a different platform or artifact, or product-policy knowledge not encoded in the retained client.

## Cross-cutting source findings

| Mechanism question | Source-confirmed answer | Representative anchors |
|---|---|---|
| How does MCP task-result waiting progress? | The result handler drains queued messages, checks terminal state, and waits again. `_waitForTaskUpdate` uses a timeout every 1,000 ms by default and honors a task-level `pollInterval`. | `_waitForTaskUpdate`, `_clearTaskQueue` [~43,254–43,897](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L43254) |
| What does MCP task cancellation clean up? | A terminal task cannot be cancelled. Successful cancellation marks `cancelled` and invokes `_clearTaskQueue`, which drains residual queue state and rejects queued request resolvers with `Task cancelled or completed`. Terminal-result retrieval invokes the same cleanup. Neither caller awaits the cleanup promise before returning. | cancellation handler and `_clearTaskQueue` [~43,288–43,302, ~43,874–43,887](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L43288) |
| When can an internal completed task be evicted? | Terminal state alone is insufficient: `notified`, `retain`/`evictAfter`, active keepalive reasons, and workflow-specific deadlines gate eviction. The internal terminal vocabulary is `completed`/`failed`/`killed`, distinct from MCP `cancelled`. | internal task registry [~350,180–350,363](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L350180) |
| Can `SendMessage` restart any stopped agent? | No. An explicit stopped-by-user marker is terminal for resumption. Other stopped or evicted agents can be resumed from retained state/transcript, subject to resume-state validation and name pinning. | resumption errors [~413,414–414,470](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L413414); pin guard [~419,850](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L419850) |
| Does an agent's completed turn kill all owned background work? | No. Staged cleanup marks non-shell monitors and shell tasks as `keepaliveGated`; active ownership can preserve them beyond turn completion. | staged cleanup [~353,400–353,440](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L353400) |
| What are the hardcoded recurring-cron jitter defaults? | `recurringFrac: 0.5` and `recurringCapMs: 1800000`, meaning up to 50% of the period, capped at 30 minutes. | default config [~257,815–257,816](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L257815) |
| What does `ScheduleWakeup({stop:true})` stop? | It cancels session tasks with `kind === "loop"` and clears dynamic-loop state. A fixed-interval `/loop` is a recurring cron and requires `CronDelete`. | dynamic cleanup [~258,303–258,321](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L258303); tool contract [~400,823–400,930](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L400823) |
| Does every workflow result labelled `async_launched` represent a launched task? | No. A compile-failure branch allocates identifiers and returns that status plus `error`, but returns before `LKr(...)` registers/starts the workflow. The renderer says it “was not launched.” | `jat`, `LKr`, and tool call [~385,563, ~388,554, ~389,583–389,675](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L389583) |
| Are observer delivery batches retried after ordinary gate or send failure? | No. The current buffer is spliced into one batch; deny/error/delivery failure drops it. Only resumable-state loss starts a fresh observer and retries that digest. A user-stopped observer remains terminal. | `Zuy`, `tdy` [~448,930–449,043](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L448930) |
| What do slash automation restrictions change? | Shell-disable policy replaces eligible user/project/plugin embedded shell forms with a literal marker instead of executing them. Policy-sourced skills remain on permission-checked local expansion; MCP prompts use neither local expansion nor replacement. `disableModelInvocation` excludes model/Skill invocation but does not by itself prevent direct user slash invocation. Unknown command-like names return locally with no model query. | `processSlashCommand`/`ils` [~351,442–352,352](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L351442); `Iyo`, `uhy`, `createSkillCommand` [~464,401–464,650](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L464401) |

## Per-page question rounds

### `agent-runtime-scheduling-and-completion.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is `_waitForTaskUpdate` event-only, or does it poll at a defined cadence? | It uses a timeout every 1 second by default and uses the task's `pollInterval` when present. | Added the exact wait cadence to anchors, diagram, and task model. |
| What happens to queued messages/requests on terminal retrieval or cancellation? | Both paths invoke queue cleanup. Cleanup drains residual state and rejects queued request resolvers; already-terminal cancellation is refused. | Added queue cleanup and cancellation failure semantics. |
| Does internal terminal state immediately remove a task? | No. Notification state, retention/deadline state, keepalive reasons, and workflow `evictAfter` gates apply. | Added the post-terminal eviction boundary while preserving the internal/MCP status distinction. |

#### Round 2

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does terminal-result or cancellation handling await queue cleanup before returning? | No. Both call the async `_clearTaskQueue(...)` method without `await`; resolver rejection occurs when its `dequeueAll(...)` finishes. | Clarified response ordering in the anchor, sequence diagram, and task-message-queue contract. |

#### Round 3 — convergence

Zero new source-answerable mechanism questions. Exact crash consistency between asynchronous queue mutation and a transport response is not established and was not inferred. **Status: edited and converged.**

### `agents-tasks-and-subagents.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Can messaging resume an agent that was stopped explicitly by the user? | No. The stopped-by-user marker blocks resumption; other stopped/evicted agents may resume from retained state/transcript. | Added the stop-versus-resume distinction and retained name pinning. |
| Does parent/agent completion unconditionally tear down owned monitors and shell tasks? | No. Those cleanup stages are keepalive-gated. | Added staged descendant-resource cleanup. |
| What happens to an isolated worktree at completion? | An unchanged native Git worktree is removed; a changed worktree is unlocked and retained with path/branch result data. | Added the exact changed/unchanged cleanup split. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. The page does not claim that every transcript is indefinitely resumable or that external process resources survive host termination. **Status: edited and converged.**

### `architecture.md`

#### Round 1

Zero genuine source-answerable architecture gaps were found. The page already separates orchestration from the model/tool runtime, task records from subagent contexts, local automation from hosted review, and slash dispatch from permission enforcement. Operational details belong in the focused implementation pages.

#### Round 2

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does the architecture failure row's shell-placeholder behavior apply uniformly to every command provenance? | No. Eligible user/project/plugin content receives the placeholder; policy-sourced skills retain permission-checked local expansion, while MCP prompts perform no local shell expansion. | Narrowed the architecture-level failure row to preserve the source-type boundary documented by the owning slash page. |

#### Round 3 — convergence

Zero new source-answerable mechanism questions. **Status: edited and converged.**

### `cron-and-scheduled-tasks.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What are the actual hardcoded recurring jitter fraction and cap? | 50% and 1,800,000 ms (30 minutes), not the page's previous 10% and 15 minutes. | Corrected both prose and the default object. |
| Does `ScheduleWakeup({stop:true})` cancel every `/loop` mode? | No. It ends dynamic wakeups only; fixed-interval `/loop` is recurring cron state and requires `CronDelete`. | Added mode-specific stop and zero-count semantics. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Scheduling precision still depends on session liveness, idle gates, ownership, and host timers; no wall-clock delivery guarantee was added. **Status: edited and converged.**

### `dynamic-workflows.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does an `async_launched` compile-error result mean a workflow task started? | No. The branch returns before `LKr(...)`; no task is registered and no agent runs despite the result label and allocated IDs. | Clarified successful launch wording, the misleading result shape, and the failure table. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. No durability guarantee beyond the visible journal/write path is inferred. **Status: edited and converged.**

### `observer-agents.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What happens to a buffered digest when the delivery gate denies/errors or delivery throws? | The assembled batch is dropped; it is not requeued. | Added best-effort batch semantics. |
| Which observer delivery failure starts fresh, and which remains stopped? | `ResumeAgentStateError` allocates a fresh ID and retries with a recovery note; `AgentStoppedByUserError` makes the pairing terminal. | Tightened the existing recovery distinction. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Model/provider handling after a digest is delivered and any hosted observer implementation remain outside this local call path. **Status: edited and converged.**

### `slash-commands-and-automation.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does shell-disable policy reject a skill or execute it without shell output? | Neither for eligible user/project/plugin content: it replaces fenced/inline shell forms with a literal policy marker and loads the remaining content. | Added the replacement behavior. |
| Does `disableModelInvocation` also block a user typing the slash command? | No. It controls model/Skill availability; direct user invocation remains possible when the command is enabled and user-invocable. | Added the model-versus-user caller boundary. |
| Does an unknown slash command reach the model? | A syntactically command-like unknown returns locally with `shouldQuery: false` and an optional suggestion; other parse/fallback branches can become ordinary prompts. | Added dispatch and fallback semantics without universalizing every slash-prefixed input. |

#### Round 2

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Do policy-sourced and MCP-served skills receive the same shell placeholder? | No. Policy-sourced skills bypass replacement and retain normal permission-checked local shell expansion. MCP-served prompts skip both local expansion and placeholder replacement. | Replaced the generic “separate paths” wording with the exact branch behavior. |

#### Round 3 — convergence

Zero new source-answerable mechanism questions. Remote-control command gating and individual built-in command internals remain documented at their owning pages. **Status: edited and converged.**

## Evidence-limited questions retained

1. **Hosted/server behavior:** hosted review scheduling, remote routine execution, cloud agent persistence, and server-side observer/workflow behavior are not inferred from local client routes.
2. **Crash consistency:** the bundle shows queue clearing, journals, task metadata, and scheduled-task files, but does not establish an atomic crash transaction across all asynchronous writes and responses.
3. **Host/process lifetime:** keepalive ownership delays cleanup inside the runtime; it does not prove resources survive process termination or external supervisors.
4. **Delivery guarantees:** cron firing depends on liveness/ownership/idle checks, observer batches are explicitly best-effort, and peer resumption depends on retained state. No exactly-once guarantee is claimed.
5. **Provider/model semantics:** the local artifact establishes dispatch and framing, not how a provider interprets delivered observer digests or workflow prompts.
6. **Feature rollout:** source presence does not prove availability for every account, organization, provider, platform, policy, or feature-gate cohort.

## Final convergence result

A complete post-edit pass over all seven in-scope pages produced **zero new source-answerable mechanism questions**.

| Page | Documentation decision | Final pass: new source-answerable questions | Status |
|---|---|---:|---|
| `agent-runtime-scheduling-and-completion.md` | Edited | 0 | Converged |
| `agents-tasks-and-subagents.md` | Edited | 0 | Converged |
| `architecture.md` | Edited | 0 | Converged |
| `cron-and-scheduled-tasks.md` | Edited | 0 | Converged |
| `dynamic-workflows.md` | Edited | 0 | Converged |
| `observer-agents.md` | Edited | 0 | Converged |
| `slash-commands-and-automation.md` | Edited | 0 | Converged |

Cross-page terminology now consistently preserves these boundaries:

- MCP task terminal `cancelled` versus internal task terminal `killed`;
- terminal state versus notification/retention/keepalive eviction;
- explicit user stop versus resumable stopped/evicted agents;
- dynamic-loop wakeups versus fixed-interval recurring cron;
- an `async_launched`-shaped compile error versus an actually registered workflow;
- observer resume recovery versus dropped best-effort batches;
- shell-content replacement, model-invocation exclusion, and direct user invocation.

## Validation

| Check | Result |
|---|---|
| Final complete question pass | All seven pages were re-read after the last source-type correction; zero new source-answerable mechanism questions emerged. |
| Editor diagnostics | No errors in the seven audited pages or this ledger. |
| Relative Markdown targets | All 99 relative targets across the seven pages and ledger resolved on disk. |
| File endings | All eight audit files end with a newline. |
| Whitespace | `git diff --check` passed across all tracked worktree changes, including the seven edited pages. |
| Documentation build | `website/npm run build` completed successfully: Astro generated 89 pages, including all audited pages and this ledger; Pagefind and sitemap generation also completed. Vite emitted only its non-fatal large-chunk advisory. |
| File accounting | This audit modified the seven scoped pages and created this ledger. The section `README.md`, navigation/indexes, retained source bundles, generated prompt catalog/source atlas, website configuration, and unrelated documentation changes were not edited by this audit. |

**Audit status: complete and converged for Claude Code `2.1.215`.**
