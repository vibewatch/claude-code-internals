# Agents and automation mechanism question audit

This ledger records the original full-analysis reverse-engineering audit of seven mechanism-oriented pages under `docs/06-agents-automation`, plus later focused rounds including the experimental Agent Teams lifecycle. It records the reader questions used to test each page, source-confirmed answers, documentation decisions, and the boundary beyond which the retained artifacts do not support a claim.

## Scope and exclusions

Original audited pages:

1. [`agent-steering-interruption-and-completion.md`](../06-agents-automation/agent-steering-interruption-and-completion.md) (the focused successor to the original `agent-runtime-scheduling-and-completion.md`)
2. [`agents-tasks-and-subagents.md`](../06-agents-automation/agents-tasks-and-subagents.md)
3. [`architecture.md`](../06-agents-automation/architecture.md)
4. [`cron-and-scheduled-tasks.md`](../06-agents-automation/cron-and-scheduled-tasks.md)
5. [`dynamic-workflows.md`](../06-agents-automation/dynamic-workflows.md)
6. [`observer-agents.md`](../06-agents-automation/observer-agents.md)
7. [`slash-commands-and-automation.md`](../06-agents-automation/slash-commands-and-automation.md)

The later Agent Teams follow-up added and audited [`agent-teams.md`](../06-agents-automation/agent-teams.md), then updated the section guide, architecture/ordinary-Agent/runtime handoffs, canonical flag/settings/environment/feature-gate references, cross-cutting protocol map, navigation, and website sidebar. Subsequent focused rounds documented agent messaging and, during the full-system review, [`worktree-isolation-and-handoffs.md`](../06-agents-automation/worktree-isolation-and-handoffs.md). The original seven-page audit excluded those navigation/reference files; that historical scope does not describe the later focused rounds.

Extracted source artifacts, generated prompt catalogs, and `source-atlas/` remained read-only throughout. A page that already answered its source-answerable mechanism questions was intentionally left unchanged rather than churned.

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
| How does `/goal` keep a session working until a condition holds? | It installs an unscoped session prompt Stop hook. A small structured-output evaluator checks transcript evidence at normal stop boundaries; unmet results update `active_goal` and continue, while met/impossible results remove the hook. Transcript attachments support resume/fork reconstruction. | command/hook state [~454,790–454,881](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L454790); stop loop [~458,940–459,120](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L458940); evaluator [~573,350–573,530](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L573350); restore [~860,118–860,150](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L860118) |

## Per-page question rounds

### `agent-steering-interruption-and-completion.md` (formerly `agent-runtime-scheduling-and-completion.md`)

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

#### Round 4 — `/goal` follow-up

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What do `/goal`, `/goal <condition>`, and `/goal clear` do? | They inspect, install, or remove an unscoped session prompt Stop hook. Six clear-like tokens are accepted, conditions are capped at 4,000 characters, and trust/hook-policy gates apply to installation/restoration rather than inspection or clearing. | Added command grammar, gates, aliases, and state shape. |
| How is completion judged? | `JPd()` calls the small fast model with thinking disabled, no tools, a 30-second default timeout, transcript-only instructions, and a JSON schema for `ok`, `reason`, and optional `impossible`. | Added evaluator inputs, schema, timeout, and context truncation/retry behavior. |
| What happens for unmet, met, impossible, and evaluator-error outcomes? | Unmet blocks normal stopping and increments the active goal; met and impossible remove the hook and clear state; evaluator failures are non-blocking for the current stop attempt and leave the hook registered. | Added the branch diagram and fail-open boundary. |
| Does background work count as goal completion? | No. Qualifying background work temporarily removes the goal hook for one stop pass and restores it in `finally`, deferring evaluation. | Added background-task ordering. |
| Does resume preserve goal counters? | No. Local resume/fork reconstructs the condition from the newest nonterminal `goal_status` attachment but resets iterations/time/token baselines. Remote attach can seed the latest worker `active_goal` object instead. | Added local/remote persistence distinctions. |
| Is `/goal` an unbounded deterministic loop? | No deterministic guarantee exists: model judgment and transcript visibility decide each check. No explicit iteration cap was found, but non-reinvoking end-turn branches and evaluator errors can end the current turn without satisfying the condition. | Added limits and non-guarantees. |

#### Round 5 — convergence

The post-edit reread produced zero new source-answerable mechanism questions. Remaining uncertainty is provider/model judgment, server retention for remote history, and abrupt-process behavior. **Status: edited in follow-up and converged.**

## Evidence-limited questions retained

1. **Hosted/server behavior:** hosted review scheduling, remote routine execution, cloud agent persistence, and server-side observer/workflow behavior are not inferred from local client routes.
2. **Crash consistency:** the bundle shows queue clearing, journals, task metadata, and scheduled-task files, but does not establish an atomic crash transaction across all asynchronous writes and responses.
3. **Host/process lifetime:** keepalive ownership delays cleanup inside the runtime; it does not prove resources survive process termination or external supervisors.
4. **Delivery guarantees:** cron firing depends on liveness/ownership/idle checks, observer batches are explicitly best-effort, and peer resumption depends on retained state. No exactly-once guarantee is claimed.
5. **Provider/model semantics:** the local artifact establishes dispatch and framing, not how a provider interprets delivered observer digests or workflow prompts.
6. **Feature rollout:** source presence does not prove availability for every account, organization, provider, platform, policy, or feature-gate cohort.

## Final convergence result

The original complete post-edit pass over all seven in-scope pages produced **zero new source-answerable mechanism questions**. Later focused passes covered `/goal`, Agent Teams, messaging, and worktree isolation; each produced zero new questions after correction.

| Page | Documentation decision | Final pass: new source-answerable questions | Status |
|---|---|---:|---|
| `agent-steering-interruption-and-completion.md` | Renamed and narrowed during the information-architecture review | 0 | Converged |
| `agents-tasks-and-subagents.md` | Edited | 0 | Converged |
| `worktree-isolation-and-handoffs.md` | New full-system follow-up | 0 | Converged |
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
- shell-content replacement, model-invocation exclusion, and direct user invocation;
- `/goal` Stop-hook continuation versus cron/dynamic scheduling, local transcript reconstruction versus remote `active_goal` seeding, and model judgment versus deterministic completion.
- session-wide `EnterWorktree` cwd relocation versus Agent-specific cwd isolation versus the background shared-checkout write guard;
- Git sparse checkout versus explicitly symlinked directories and `.worktreeinclude` copies; and
- project-keyed global worktree state versus transcript `worktree-state` continuity.

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

### `/goal` follow-up — 2026-07-24

- Full-analysis source reads traced command registration, trust/policy gates, session-hook ownership, Stop evaluation, background-work deferral, structured evaluator outcomes, query events, transcript reconstruction, session metadata, remote seeding, SDK forwarding, and TUI rendering.
- Editor diagnostics reported no errors in the expanded slash-command page, agents chapter index, interactive command reference, or this ledger.
- All 77 relative Markdown targets across those four files resolved on disk; stale/missing `/goal` markers were absent.
- Repository-wide `git diff --check` passed.
- Astro loaded 88 documentation sources and generated 89 static pages, including `/06-agents-automation/slash-commands-and-automation/`; Pagefind and sitemap generation completed. The only warning was Vite's existing advisory for chunks larger than 500 kB after minification.
- Follow-up accounting contains exactly four documentation changes. No path under `claude-code-pkg/` or `source-atlas/` changed.
- `source-atlas/` was intentionally left untouched because no package-version comparison was requested and the readable retained bundle supplied enclosing control-flow evidence directly.

### Complete built-in command follow-up — 2026-07-24

This follow-up extended beyond the original seven-page domain scope because the user asked whether any other commands remained unresearched. It treated the [command-line reference](../01-runtime-lifecycle/command-line-reference.md) as the canonical cross-domain catalog and put each nontrivial mechanism in its existing owner page rather than creating a duplicate command page.

#### Inventory result

| Layer | Source-confirmed inventory |
|---|---|
| Core | `Hur()` statically references 105 distinct names across conditional branches, including hidden, gated, compatibility, and disabled objects. Same-name TUI/text twins are one name. |
| Bundled | 29 `Lu({...})` call sites expand to 32 names because the Artifact template registration loops over dashboard, report, data-table, and explainer. |
| Distinct static names | 136 across core + bundled because `/design` appears in both layers. This is an artifact inventory, not one account's visible menu. |
| Dynamic/non-built-in | Filesystem skills, legacy command files, nested workflows, plugin/builtin-plugin skills, and MCP prompts are merged at runtime and intentionally excluded from the static built-in count. |
| Non-advertised support | `INTERNAL_ONLY_COMMANDS` additionally retains `/commit-push-pr` and disabled `/version` objects; stubs/null feature arms are not user commands. |

#### Question rounds

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is the menu one hard-coded array? | No. `_xo()` merges filesystem skills, workflows, plugins, bundled skills, and `Hur()`; `getCommands()` later adds MCP/fallback entries, gates them, and resolves scopes/collisions. | Added the assembly pipeline and complete catalog. |
| Do `local-jsx`, `local`, and `prompt` mean the same execution path? | No. They are TUI, text/control, and prompt/skill owners. Headless, remote, bridge, and thin-client filters admit different subsets; same-name twins adapt one command to multiple surfaces. | Added type and surface tables. |
| Can a model invoke every direct slash command? | No. `disableModelInvocation`, `userInvocable`, bundled kill switches, skill overrides, permission rules, session allowlists, and caller identity are independent gates. | Added exact caller-boundary behavior. |
| How are duplicate skills resolved? | First-match ordering matters; nested project skills can be qualified, fallbacks can be dropped by plugin/MCP suffixes, and unsafe unresolved collisions can be omitted. Bundled `/design` precedes its core helper. | Added collision/scoping semantics. |
| Does `/btw` append a second user turn or pause the main agent? | Neither. It runs a one-turn no-tool fork over cache-safe context with cache writes/transcript disabled. The TUI keeps at most 20 successful side-thread pairs in memory; remote control uses a correlated, cancellable `side_question` request with retry progress. | Added side-question isolation, history, cancellation, and explicit promotion-to-fork behavior. |
| What owns `/autofix-pr` after the command resolves a PR? | It creates or reuses a long-running remote-agent task keyed by PR metadata, subscribes the cloud session to PR events, warns on missing GitHub-app/webhook delivery and unpushed commits, and archives a just-created session on cancellation when possible. | Added PR resolution, consent, deduplication, subscription, and failure behavior. |
| Does `/ultraplan` merely return a prompt string? | No. It launches remote plan mode, polls every three seconds for `ExitPlanMode` calls/results, retries transient polling failures, and routes approval either to remote implementation or a local teleport choice. Missing plan markers and terminal/timeout states fail explicitly. | Added launch, polling, approval/rejection/teleport, stop, and archive behavior. |
| Which apparently documented commands are actually unavailable? | `/desktop`, `/loops`, `/pause-memory`, `/update`, `/wellbeing`, `/code-walkthrough`, and `/pr-explainer` have false enable gates in this build. `/vim`, `/output-style`, and `/extra-usage` are compatibility shims; several dialogs/helpers are hidden. | Classified disabled/hidden/shim entries instead of advertising them. |
| Which configuration commands have mutation safeguards beyond ordinary permissions? | `/auto-mode-setup` separates proposal from reviewed `--apply-file`; `/import` requires a same-process preview before `--yes` and applies path/symlink/shell-marker guards; `/config` exposes only descriptor-approved values; `/init` confirms its artifact proposal. | Added detailed settings command mechanisms. |
| Are bundled commands just static prompt strings? | No. `Lu()` can extract assets, add caller/tool/hook/model/effort layers, and call dynamic builders. `/batch`, `/code-review`, `/verify`, `/run`, `/run-skill-generator`, `/debug`, `/doctor`, and Artifact skills have source-visible control flow. | Added a bundled workflow-family table. |
| Is the old “no `/undo` command” conclusion still valid? | No. The core registry defines `/rewind` aliases `checkpoint` and `undo`. All names open the same restoration selector; there is no separate arbitrary inverse-operation engine. | Corrected the context/checkpoint page and catalog. |

#### Documentation ownership

- `command-line-reference.md` now inventories every core and bundled static name, aliases, gates, disabled/hidden state, surface type, and mechanism owner.
- `slash-commands-and-automation.md` owns aggregation, collision/scoping, caller boundaries, bundled extraction, and workflow families.
- Configuration/import/init commands are in `settings-policy-and-integrations.md`.
- `/clear`, `/branch`, `/rename`, and `/recap` are in `session-resume-and-transcripts.md`.
- `/context`, `/compact`, `/autocompact`, and rewind/undo semantics are in `context-memory-compaction-checkpoints.md`.
- `/model`, `/effort`, `/fast`, `/usage`, and `/usage-credits` are in `model-selection-usage-quota-billing.md`.
- `/reload-plugins`, `/reload-skills`, and `/skill-doctor` are in `mcp-plugins-hooks.md`.
- `/debug` and hidden `/heapdump` are in `diagnostics-and-debug-logs.md`; Artifact skill commands are in `artifact-publishing-and-live-pages.md`.

The post-edit command-name scan and reread produced zero additional static built-in names lacking either a catalog classification or an owning mechanism explanation. Remaining variability is runtime-generated (custom/plugin/MCP/workflow names) or account/provider/policy/feature availability. **Status: edited and converged.**

### Model selection, concurrency, and interruption follow-up — 2026-07-24

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does Claude Code classify arbitrary task text and automatically choose a stronger/weaker model? | No general complexity classifier was found. The main session uses startup/per-turn resolution; Agent and Workflow calls use environment/call/definition/inherit precedence; helpers own role-specific models; provider failures can use fallback. | Added a cross-role model-resolution matrix and explicit non-classifier boundary. |
| How do several Agent calls in one assistant response run concurrently? | `Agent.isConcurrencySafe()` is true. `Y3g()` groups consecutive safe tool uses and `J3g()`/`Eao()` runs the group up to `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (10 by default). Non-safe tools form ordered barriers. | Added the tool-handler concurrency path and separated it from background worker lifetime. |
| What limits live Agent fan-out? | The tool scheduler bounds concurrent handler/launch work, not all live background workers. Agent depth is capped at five and session spawns at 200 by default. Workflow local agents have a separate FIFO `min(16,max(2,cores-2))` limiter and a 1,000-call lifetime backstop. | Added layer-specific concurrency/budget boundaries. |
| Do Task records execute or interrupt agents? | No. They are shared status/ownership/dependency state. Idle in-process teammates can claim the first unowned pending task whose blocker IDs are completed/absent; `TaskUpdate` does not preempt a running provider call. | Added the task-state versus worker-execution distinction and claim rule. |
| How is new work inserted while an agent is running? | Main prompts use `now`/`next`/`later`; eligible `next` work folds between tool batches. Live Agent `SendMessage` queues pending attachments; teammate messages wait in pending-user/mailbox queues. These are boundary-based steering mechanisms. | Added queue priority, mid-turn folding, Agent steering, and teammate mailbox behavior. |
| What is the difference between interrupt, cancel, and stop? | Turn/Esc aborts the active controller; `cancel_async_message` removes a still-queued UUID; `control_cancel_request` cancels one correlated control operation; task/agent stop invokes a task-type kill handler and persists a user-stop marker that blocks automatic resumption. | Added scope/state diagrams and survival semantics. |

The post-edit semantic reread found no further local-client mechanism gap across model resolution, Agent/Workflow concurrency, task claiming, queue steering, and interruption. Provider-side scheduling and operating-system fairness remain outside the retained client. **Follow-up status: edited and converged.**

### Experimental Agent Teams follow-up

This follow-up reconstructed the complete local teammate lifecycle rather than treating the strings `team_name`, `TeamCreate`, or `mailbox` as a complete design. Direct reads covered enablement/startup, `AsyncLocalStorage` and external-process identity, backend selection, named-Agent branching, roster/task/mailbox storage, in-process polling, permission forwarding, public versus internal messaging, cooperative/forced shutdown, clean-exit cleanup, and transcript-backed evicted-worker recovery.

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is the “single implicit team” always active, and can the model create/delete teams? | No. `isAgentSwarmsEnabled()` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` or an exact raw-argv `--agent-teams` token and `tengu_amber_flint !== false`; normal startup initializes the team only for an interactive non-teammate lead. `TeamCreate`/`TeamDelete` remain expected-absent legacy names, and `Agent.team_name` is ignored. The raw token is not registered in the Commander root option table. | Added the exact gate, raw-argv caveat, startup conditions, implicit-team contract, and retired-tool boundary. |
| Which named Agent calls become teammates? | Only a call with active `teamContext` and `name`, with no fork, `isolation`, or `cwd`. The branch runs before ordinary sync/background selection and returns `teammate_spawned`; teammates cannot create a second roster level. | Documented the branch predicate and separated teammates from ordinary named/worktree/remote/fork Agents. |
| How is execution topology chosen? | One captured `teammateMode` value selects `in-process` (default), `tmux`, `iterm2`, or `auto`. A normal noninteractive lead does not initialize a team; if an inherited/nonstandard noninteractive context reaches the selector, it forces in-process. Explicit pane failures fail, while `auto` can warn and fall back in-process. | Added mode selection, terminal detection/failure behavior, pane layouts, child flags/env/config inheritance, and in-process loop reuse. |
| What exactly is stored on disk? | The roster is locked `~/.claude/teams/<roster-sanitized-team>/config.json`; inboxes are locked, atomically rewritten JSON arrays at `~/.claude/teams/<inbox-sanitized-team>/inboxes/<agent>.json`; tasks are separate locked JSON records under `~/.claude/tasks/<task-list-id>/` with `.lock` and `.highwatermark`. Roster writes under lock use ordinary `writeFile`; inbox writes use atomic whole-array replacement. | Added exact trees, schemas, lock/atomic-write distinctions, invalid-entry pruning, and the different custom-name sanitizers. Explicitly rejected the incorrect JSONL/append-only mailbox model. |
| Do task records launch workers or interrupt provider calls? | No. They coordinate owner/status/dependencies. Idle in-process teammates poll every 500 ms and lock-claim the first eligible pending task; explicit assignment writes `task_assignment`. Local shared-task `TaskGet` returns current state immediately, unlike the separate SDK/MCP waiter. | Added local task schema/claim race behavior and corrected the cross-page SDK/MCP-versus-local `TaskGet` boundary. |
| What does `SendMessage` expose versus what the mailbox understands internally? | Public structured input is limited to shutdown request/response and plan response; strings require `summary`, broadcast and `@team` addressing are rejected, and delivery differs for main, ordinary Agent, teammate mailbox, and peer sessions. Internal mailbox frames additionally carry permission, sandbox, mode, task, idle, and termination traffic. | Added the public/internal protocol split, routing/pinning behavior, shutdown priority, and malformed/unrouted-frame handling. |
| Can one teammate grant another permission or approve its plan? | No. Peer content is explicitly non-user input. In-process forwarding accepts a matching `permission_response` only when the outer sender is `team-lead`; `localDisplayOnly` consent is denied; plan and mode responses are likewise lead-only. `team_permission_update` is dropped. | Added the anti-laundering trust model and permission/plan/mode enforcement paths. |
| What is the difference between interrupt, shutdown, stop, and process exit? | Current-work interruption returns an in-process teammate to idle. Cooperative shutdown requires a structured response. Forced stop aborts lifecycle state, marks killed/notified, removes the member with stale-removal protection, and bounds pane teardown to 10 seconds. Global shutdown cleanup kills registered pane members, removes listed worktrees, and recursively removes the team directory. | Added separate lifecycle diagrams and exact cleanup/failure semantics. |
| Are Agent Teams durable across sessions? | Not as a whole-team service. External children can reconstruct context while the roster exists. An evicted recipient with `taskKind:"in_process_teammate"` can be rebuilt in the active team from transcript/metadata; otherwise the same-ID ordinary Agent resume path is tried. Clean exit removes the team directory, teammate durable cron is refused, and process-local controllers/callbacks are not restored. Shared task files may remain, but no startup whole-team reconstruction path was found. | Replaced vague durability language with the narrow recovery paths, clean-exit boundary, crash-leftover caveat, and evidence limits. |

Two independent read-only reviews were followed by direct revalidation of every disputed claim. The direct source confirmed `cleanupSessionTeams()` → `cleanupTeamDirectories()` recursive removal and the `jKr()` 10,000 ms pane-teardown bound; those claims were retained despite one review failing to locate their enclosing code. The post-correction reread found no new source-answerable local Agent Teams mechanism question. **Follow-up status: documented and converged.**

#### Agent Teams validation

- Editor diagnostics reported no errors in the new page, its cross-links/references/navigation, website configuration, or this ledger.
- All 1,202 relative Markdown targets across the 40 currently changed Markdown files resolved on disk, including every new source-line link.
- Generated HTML contained the expected Agent Teams anchors (`what-one-implicit-team-means`, `teammate-execution-modes`, `shared-task-files`, `shared-task-lifecycle`, `messaging-and-protocol-frames`, and `shutdown-cleanup-and-resume`), and the ordinary-Agent page linked to the intended generated routes/fragments.
- Repository-wide `git diff --check` passed.
- Astro loaded 89 documentation sources and built 90 pages, including `/06-agents-automation/agent-teams/`; Pagefind indexed 90 HTML files and sitemap generation completed. The only warning was Vite's existing advisory for chunks larger than 500 kB after minification.
- `git diff --name-only -- claude-code-pkg source-atlas` was empty. Retained source and generated/source-atlas artifacts were not edited.

### Built-in/native agent inventory follow-up — 2026-07-24

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| How many native agents are present? | `source:"built-in"` definitions yield nine agent roles: six normal personas (`general-purpose`, `Explore`, `Plan`, `statusline-setup`, `claude-code-guide`, `claude`) plus coordinator-only `worker`, experimental `fork`, and internal `workflow-subagent`. | Added a count with normal-versus-total scope instead of presenting one misleading universal number. |
| Are all nine simultaneously available? | No. `getBuiltInAgents()` returns up to six in normal mode, only `[worker]` in coordinator mode, or `[]` when the SDK disable env applies to a noninteractive session. Safe mode, Agent-view policy, Explore/Plan gates, and SDK entrypoint further reduce the normal roster. `fork` and `workflow-subagent` use separate call paths. | Added the exact roster builder and gate matrix. |
| What does each normal persona do? | General execution, read-only search, read-only architecture planning, status-line configuration, official-doc guidance, and background/FleetView catch-all are distinct prompts/tool/model profiles. | Added purpose, tools/model posture, and availability boundary for every normal persona. |
| Do runtime labels increase the count? | No. `main`, `subagent`, `main-session`, `team-lead`, and `teammate` classify contexts/tasks; they are not `source:"built-in"` agent definitions. Observer personas are selected from the dynamic agent registry. | Added explicit exclusions and preserved the Agent Teams/observer distinction. |

The source inventory was derived from executable definitions and `getBuiltInAgents()` control flow, not prompt-catalog string counts. `source-atlas/` remained untouched because no package-version comparison was requested. **Follow-up status: documented and converged.**

### Agent messaging and communication follow-up — 2026-07-24

This follow-up traced `SendMessage` as an address resolver and target router rather than assuming one agent chat transport. Direct reads covered recipient discovery and ambiguity, conversation pins and rebound rejection, live/stopped/evicted Agent delivery, team mailbox persistence and poll order, main/local/cloud session paths, observer reports, completion notifications, and receive-side safe-boundary insertion.

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does `SendMessage` itself carry every message? | No. It resolves and validates a target, then dispatches to the target-owned process queue, team mailbox, or main priority queue. Local-socket and cloud-API cases are also implemented, but their candidate providers return empty lists in this exact artifact. | Added a router diagram, source anchors, target transport matrix, and dormant-peer-route caveat. |
| Does “sent” mean the recipient model processed the message? | No. The tool result acknowledges enqueue/write/socket/API acceptance. A recipient reply is a separate `SendMessage`; background-Agent completion normally uses `task-notification`. | Separated send acknowledgement, peer reply, and completion paths. |
| Can a message alter a request already in flight? | No. Live Agents drain pending messages into `queued_command` attachments; teammates poll at turn-end/idle boundaries; main/peer events enter priority queues. | Added receive timing and explicit non-preemption semantics. |
| How are stale or ambiguous names handled? | Ambiguity returns candidates rather than guessing. Conversation pins reject a later name rebound; team sends revalidate the member ID against current state. | Added address resolution, references, pins, and stale-recipient behavior. |
| Can messaging revive stopped work? | A user-stopped marker blocks automatic resumption. Other stopped/evicted Agents can resume from transcript/metadata; teammate-typed metadata can reconstruct an in-process teammate inside an active team. | Added state-specific resume and failure behavior. |
| Is a teammate inbox append-only JSONL? | No. It is a locked JSON array atomically rewritten on append and delivery. Structured protocol frames are JSON serialized inside the outer `text`. | Added exact persistence and receive-order mechanics. |
| Can peer text approve permissions or forge control frames? | No. Receiver permissions run normally, peer/cross-session traffic is framed as non-user input, public plain text cannot masquerade as structured team protocol, and control frames require matching sender/role checks. | Added the anti-laundering and authority boundary. |
| Does `isolatePeerMachines` add approval to cross-machine text? | No. Plain-text `SendMessage.checkPermissions()` allows delivery and never consults that setting. Its visible approval checks are in the disabled `SendFile` implementation. | Added the text-versus-file transport-approval boundary. |
| Are shared tasks, observer reports, and completion events all peer chat? | No. Shared tasks coordinate state, `ObserverReport` is one-way, and `task-notification` reports lifecycle completion. | Added an adjacent-channel distinction table. |

Direct follow-up reads confirmed that `CSg()`/`OQn` are correctly anchored, that the stopped-by-user exception for `observer-activity` belongs to the internal observer-resume path and is unreachable from `SendMessage` because observer targets are rejected first, and that peer discovery is dormant despite retained transport implementations. The post-edit reread found no additional source-answerable message-transport question across ordinary Agents, teammates, main, local/cloud route code, observers, or task completion. Server-side cloud delivery after HTTP acceptance and provider behavior after insertion remain evidence-limited. `source-atlas/` was intentionally left untouched. **Follow-up status: documented and converged.**

## Full-system follow-up: worktree isolation and handoffs — 2026-07-25

The cross-inventory audit found worktree behavior split among Agent prose, hook names, session persistence, settings, and generated tool prompts without an owning lifecycle page.

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Are session and Agent worktrees the same cwd transition? | No. `EnterWorktree` changes the session/process cwd; `Agent({isolation:"worktree"})` pins only that agent's cwd. | Created [Worktree isolation and handoffs](../06-agents-automation/worktree-isolation-and-handoffs.md) with a three-shape comparison. |
| When do hooks versus Git create the directory? | A configured `WorktreeCreate` hook wins, even in a Git repo; otherwise Git creates under `.claude/worktrees/` after trust/name/symlink checks. | Added backend precedence and hook result validation. |
| How do sparse and shared directories work? | `sparsePaths` configures Git cone-mode sparse checkout; `symlinkDirectories` is a separate, explicit post-checkout operation; `.worktreeinclude` safely copies selected ignored files. | Corrected the audit report's conflation. |
| What prevents concurrent deletion? | Git lock reasons include Claude role/name/PID/process-start. Other-live/unknown locks produce guest/fail-safe behavior; dead Claude locks can be reclaimed. | Added ownership and stale-lock rules. |
| Where is continuity stored? | `activeWorktreeSession` lives in the current-project entry of `~/.claude.json`; a nullable `worktree-state` record lives in session JSONL. They are not one transaction. | Added dual persistence and corrected the prior path ambiguity. |
| How is work protected on exit/completion? | `ExitWorktree remove` refuses changed/unverifiable state without explicit discard; entered-existing worktrees are never removed. Agent cleanup removes unchanged worktrees and retains changed work. | Added keep/remove/agent cleanup and failure tables. |

The focused reread produced zero new source-answerable worktree questions. Git crash semantics, hook backend durability, and filesystem/platform behavior remain evidence limits. **Focused follow-up status: new page, cross-linked, and converged.**

**Audit status: complete and converged for Claude Code `2.1.215`.**
