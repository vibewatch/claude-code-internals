# Cron and scheduled tasks

This page documents Claude Code's `Kairos` scheduled-task subsystem: how `/schedule`, `/loop`, `CronCreate`, `CronList`, `CronDelete`, `ScheduleWakeup`, and the autonomous-loop sentinels turn into a process-local scheduler that fires queued prompts back into the active session.

Use this page alongside:

- [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md) for the `WorktreeDaemonJobScheduler` that hosts scheduled tasks across sessions.
- [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md) for the hook events emitted around scheduled fires.
- [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md) for the `tengu_kairos_*` GrowthBook gates that toggle the subsystem.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| CronCreateToolName | `var CRON_CREATE_TOOL_NAME = "CronCreate"` | Tool name the model calls to schedule a job. |
| CronDeleteToolName | `var CRON_DELETE_TOOL_NAME = "CronDelete"` | Tool name to cancel a previously scheduled job. |
| CronListToolName | `var CRON_LIST_TOOL_NAME = "CronList"` | Tool name to list scheduled jobs. |
| ScheduleWakeupToolName | `var sf = "ScheduleWakeup"` | Tool name used by `/loop` dynamic mode to schedule the next iteration. |
| CronCreateDescriptionBuilder | `function buildCronCreateDescription(durableEnabled)` | Returns the short tool description with or without the durable-mode note. |
| CronCreatePromptBuilder | `function buildCronCreatePrompt(durableEnabled)` | Returns the model-facing prompt explaining cron syntax, off-minute heuristics, durability rules, and runtime behavior. |
| CronDeletePromptBuilder | `function buildCronDeletePrompt(durableEnabled)` | Returns the CronDelete tool description. |
| CronListPromptBuilder | `function buildCronListPrompt(durableEnabled)` | Returns the CronList tool description. |
| CronGate | `function isKairosCronEnabled()` | Gate: `!CLAUDE_CODE_DISABLE_CRON env && tengu_kairos_cron`. |
| DurableCronGate | `function isDurableCronEnabled()` | Gate: `tengu_kairos_cron_durable`; controls whether jobs may persist to disk. |
| CronJitterConfig | `function getCronJitterConfig()` | Returns the validated `tengu_kairos_cron_config` blob: `{recurringFrac, recurringCapMs, oneShotMaxMs, oneShotFloorMs, oneShotMinuteMod, recurringMaxAgeMs, cacheLeadMs}`. |
| ScheduledTaskAgePredicate | `function isRecurringTaskAged(task, now, maxAgeMs)` | True for recurring non-permanent jobs older than `maxAgeMs`. Used to fire-and-expire long-running recurring jobs. |
| MissedTaskNotificationBuilder | `function buildMissedTaskNotification(tasks)` | Produces the "the following one-shot scheduled task(s) were missed" prompt that asks the user via `AskUserQuestion` whether to run them. |
| CronScheduler | `function createCronScheduler(options)` | Constructs the in-process scheduler: `{start, stop, getNextFireTime, checkNow}`. |
| LoopDynamicWakeup | `function _nK(delaySeconds, prompt, reason)` | `ScheduleWakeup`'s entry point; clamps delay, builds the cron expression, calls `addSessionCronTask`, emits `tengu_loop_dynamic_wakeup_scheduled`. |
| LoopDynamicSentinel | `var s3H = "<<autonomous-loop-dynamic>>"`, `var NFH = "<<autonomous-loop>>"` | Sentinels swapped in at fire time to resolve back to the autonomous-loop instructions. |
| LoopClampConstants | `var Wf$ = 60`, `var UH8 = 3600` | Minimum / maximum `delaySeconds` for `ScheduleWakeup`. |
| LoopChainTracker | `function getLoopChainStartedAt(prompt)`, `function setLoopChainStartedAt(prompt, state)`, `function deleteLoopChainStartedAt(prompt)` | Tracks how long a `/loop` chain has been running so the runtime can age it out. |
| LoopCancelAll | `function FH8()` | Cancels every pending `/loop` wakeup; called on user abort. |
| TaskTickConstants | `var cr4 = 1000`, `var stabilityThreshold_2 = 300`, `var m$A = 5000` | Scheduler tick (1 s), file-watcher debounce, cross-session probe interval. |
| ScheduledTasksEnabler | `function setScheduledTasksEnabled(boolean)` / `function getScheduledTasksEnabled()` | Master switch; the scheduler runs in a 1 s outer probe until enabled. |
| ScheduledTasksReactHook | `function useScheduledTasks({isLoading, assistantMode, setMessages})` | Ink-side wrapper that constructs the scheduler with the right callbacks. |
| KairosLoopDynamicGate | `function a3H()` | Gate: `tengu_kairos_loop_dynamic` controls whether `/loop` dynamic mode is offered. |

## Bundle modules in `cli.renamed.js`

| Semantic alias | Loader line(s) | Representative renamed exports | Atlas entry |
|---|---:|---|---|
| `KairosCron` | 253393, 253848 | `getCronJitterConfig`, `isKairosCronEnabled`, `isDurableCronEnabled`, `buildCronCreateDescription`, `buildCronCreatePrompt`, `buildCronDeletePrompt`, `buildCronListPrompt`, `CRON_CREATE_TOOL_NAME`, `CRON_DELETE_TOOL_NAME`, `CRON_LIST_TOOL_NAME`, `CRON_DELETE_DESCRIPTION`, `CRON_LIST_DESCRIPTION`, `DEFAULT_MAX_AGE_DAYS` | [Bundle module map — observability and ops](../99-research-atlas/module-map-from-renamed-cli.md#observability-and-ops) |
| `ScheduledTasksRuntime` | 698739, 460745 | `createCronScheduler`, `isRecurringTaskAged`, `buildMissedTaskNotification`, `buildScheduleSummary`, `triggerResponseSchema`, `RemoteTriggerTool`, `useScheduledTasks` | [Bundle module map — git, worktree, and daemon](../99-research-atlas/module-map-from-renamed-cli.md#git-worktree-and-daemon) |

## Scheduling model

```mermaid
flowchart TD
    Model[Model invokes CronCreate / ScheduleWakeup] --> Add[addSessionCronTask or persist .claude/scheduled_tasks.json]
    Add --> Store{durable?}
    Store -->|yes| Disk[.claude/scheduled_tasks.json]
    Store -->|no| Mem[session in-memory cron tasks]

    Tick[1s scheduler tick] --> Check[checkNow]
    Check --> Eval{REPL idle?}
    Eval -->|no| Skip[wait next tick]
    Eval -->|yes| Match[for each task: nextFire(task, lastFiredAt, jitter)]
    Match --> Fire{now >= nextFire?}
    Fire -->|no| Skip
    Fire -->|yes| Emit[onFire(prompt) / onFireTask(task)]
    Emit --> Aged{recurring & aged out?}
    Aged -->|yes| Delete[remove from .claude/scheduled_tasks.json]
    Aged -->|no & recurring| Recompute[recompute next fire & persist lastFiredAt]
    Aged -->|no & one-shot| Remove[mark task done & remove]

    Watcher[file watcher on scheduled_tasks.json] --> Refresh[reload tasks]
    Refresh --> Missed{one-shot fire time in past?}
    Missed -->|yes| Notify[onMissed(missedTasks) or buildMissedTaskNotification]
```

## Tools the model invokes

| Tool | Description (built by) | Persistence |
|---|---|---|
| `CronCreate` | `buildCronCreatePrompt(durableEnabled)` — explains 5-field cron, jitter heuristic, durable flag, off-minute guidance | Session-only by default; `durable: true` persists to `.claude/scheduled_tasks.json` only when `isDurableCronEnabled()` |
| `CronDelete` | `buildCronDeletePrompt(durableEnabled)` — removes from either the in-memory store or `.claude/scheduled_tasks.json` | Same |
| `CronList` | `buildCronListPrompt(durableEnabled)` — lists both durable and session-only jobs | Same |
| `ScheduleWakeup` | Long prompt at `cli.renamed.js:t3H` — for `/loop` dynamic mode only; pins to `<<autonomous-loop-dynamic>>` for autonomous loops | Session-only (always) |
| `RemoteTriggerTool` | At `cli.renamed.js:460745` (`triggerResponseSchema`) | Push-triggered, not scheduled |

The off-minute guidance in `buildCronCreatePrompt` is the load-spreading rule: when the user says "around 9am" or "hourly", the model is told to pick `57 8 * * *` rather than `0 9 * * *`, so the fleet doesn't collide on the wall-clock minute boundary. The runtime adds a small deterministic jitter on top:

- Recurring tasks fire up to `recurringFrac` (default 10%) of their period late, capped at `recurringCapMs` (15 min).
- One-shot tasks landing on `:00` or `:30` (`oneShotMinuteMod`) fire up to `oneShotMaxMs` (90 s) early.

`getCronJitterConfig()` reads `tengu_kairos_cron_config` via `getFeatureValue_CACHED_WITH_REFRESH` and validates the result against a Zod schema; on validation failure it returns the hardcoded defaults `{recurringFrac: 0.1, recurringCapMs: 1800000, oneShotMaxMs: 90000, oneShotFloorMs: 0, oneShotMinuteMod: 30, recurringMaxAgeMs: 604800000, cacheLeadMs: 15000}`.

## `/loop` dynamic mode

`ScheduleWakeup`'s prompt is hand-written for the model: it teaches that the Anthropic prompt cache has a 5-minute TTL, so picking `300s` is the worst-of-both-worlds wait. The model is steered toward either `60-270s` (cache stays warm) or `1200s+` (one cache miss, long wait). The runtime clamps to `[Wf$ = 60, UH8 = 3600]` so the model cannot reach for tighter or longer values than that.

`_nK(delaySeconds, prompt, reason)` is the `ScheduleWakeup` handler:

1. Calls `z6_(prompt)` to remove any previous pending wakeup for the same prompt — the loop is single-track per prompt.
2. Computes `startedAt` via `getLoopChainStartedAt(prompt)`. If the last scheduled wakeup is older than `UH8` seconds plus the configured slack, the chain is considered abandoned and `startedAt` resets to `now`.
3. Calls `getCronJitterConfig().recurringMaxAgeMs` (default 7 days). If the chain has been alive longer than that, the function emits `tengu_loop_dynamic_wakeup_aged_out`, sets `agedOut: true` on the chain state, and returns `null` — the loop ends.
4. Calls `K6_(delaySeconds)` to clamp and round: `delaySeconds = max(Wf$, min(UH8, round(input)))`. NaN → `Wf$`, `Infinity` → `UH8`. The returned `targetMs` is rounded up to the next minute boundary, and `cacheLeadMs` is applied to nudge the firing back by 60 s when the wait is short enough to stay inside the prompt cache.
5. Builds the cron expression as `"<min> <hour> * * *"` from the target minute/hour.
6. Calls `addSessionCronTask({id: random8hex, cron, prompt, createdAt, kind: "loop"})` and `setLoopChainStartedAt(prompt, {startedAt, lastScheduledFor: targetMs})`.
7. Calls `setScheduledTasksEnabled(true)` to wake the scheduler if it was idle.
8. Emits `tengu_loop_dynamic_wakeup_scheduled` with `chosen_delay_seconds`, `clamped_delay_seconds`, `was_clamped`, and (truncated) reason.

When the user cancels the conversation, `FH8()` enumerates all loop-kind cron tasks in the session store, removes them via `removeSessionCronTasks(...)`, calls `deleteLoopChainStartedAt(...)` per prompt, and emits a `loop_cancel_all` analytic event.

### Autonomous-loop sentinels

`<<autonomous-loop>>` is the sentinel used by `CronCreate`-style autonomous loops; `<<autonomous-loop-dynamic>>` is the sentinel for `ScheduleWakeup` autonomous loops. At fire time, the runtime resolves either sentinel back to the autonomous-loop instructions. The `ScheduleWakeup` prompt explicitly warns the model not to confuse the two.

## `createCronScheduler(options)`

`createCronScheduler` returns a self-contained scheduler with `start`, `stop`, `getNextFireTime`, and `checkNow`. It supports both session-local scheduling and external scheduling (the daemon uses it with `dir`/`lockIdentity` to drive across sessions). The hot path:

1. **Cross-session task discovery (`m(persistFlag)`)** — `y0H(dir)` reads `.claude/scheduled_tasks.json` from disk; `getExtraTasks()` (if provided) returns supplementary tasks (e.g. routine-driven tasks). For locally-claimed tasks (`createdBySessionId === currentSessionId` but a different PID), the loader refreshes `createdByPid`/`createdByProcStart` and persists via `VFH(...)`. Missed one-shot tasks (per `qnK(tasks, now)`) that pass `filter(...)` and the cross-session `R(task)` ownership check fire `onMissed(missedTasks)` or pass `buildMissedTaskNotification(...)` to `onFire`, then are removed.
2. **Tick (`B()`)** — runs once per `cr4 = 1000` ms when:
   - `O()` (the optional `isKilled` predicate) returns false
   - `q()` (the `isLoading` predicate) returns false OR we're in `assistantMode`
   The tick walks all loaded tasks, computes `nextFire` for each (via `Lf$(...)` for recurring or `pH8(...)` for one-shot), and fires anything whose `nextFire <= now`. After firing it calls `isRecurringTaskAged(task, now, recurringMaxAgeMs)`; aged-out recurring tasks fire one final time and then get removed.
3. **File watcher** — `chokidar.watch(W7H(dir))` with `awaitWriteFinish: {stabilityThreshold: 300}` so the scheduler picks up edits to `.claude/scheduled_tasks.json` without races. `add`/`change` re-runs `m(false)`; `unlink` clears the loaded list and the per-id cache.
4. **Cross-session ownership probe** — every `m$A = 5000` ms the scheduler probes `ai6(...)` to see if a sibling session has claimed the task file. The flag `I` ("I am the active claimant") gates `R(task)` so only one process ever fires a given task.

The scheduler also persists per-task `lastFiredAt` for recurring tasks via `HnK(taskIds, now, dir)` so a restart picks up where it left off.

### Cross-session liveness check (`C(pid, token)`)

`C(pid, processStart)`:
- Returns `true` (treat as dead) if `ov(pid)` (a `/proc/<pid>` existence check) is false.
- Otherwise re-reads `lzH(pid)` (the process start time) at most once every 60 s and returns `true` if the start time differs from the recorded `createdByProcStart`.

This avoids a misbehaving PID reuse from firing a task on behalf of a different process.

### Filtering and ownership (`R(task)`)

`R(task)`:
- Tasks without `createdBySessionId` are owned by whoever currently holds the claim (`I`).
- Tasks owned by the current session id always match.
- Tasks owned by a different session id match only when `I` is true AND the previous owner's PID looks dead per `C(...)`.

This is the cross-session orphan-reaping rule: a previous session can leave durable tasks behind, and the next active session picks them up only if the old PID is gone.

## Missed-task notification

`buildMissedTaskNotification(missedTasks)` is the only user-facing prompt the runtime ever auto-injects. It:

- Singular vs plural depending on `missedTasks.length`.
- Adds a strong "Do NOT execute these prompts yet. First use the AskUserQuestion tool to ask whether to run each one now. Only execute if the user confirms." — the runtime never silently executes a missed prompt.
- Lists each task with cron expression, creation timestamp, and the prompt content wrapped in a fence that escapes any backticks in the prompt.

## REPL-idle gate

Jobs fire only while the REPL is idle, not mid-query. The scheduler reads:

- `isLoading()` — true during an active model turn.
- `assistantMode` — true for headless/SDK runs that should fire jobs even when the assistant is "loading" a follow-up.

When idle, the scheduler tick runs `B()`. When not idle, ticks are skipped (the task remains queued; next idle tick will catch up).

## Recurring-task aging

Recurring tasks have a hard expiry. `isRecurringTaskAged(task, now, maxAgeMs)`:

- Returns false for non-recurring tasks, permanent tasks, or when `maxAgeMs === 0`.
- Returns true when `task.recurring && !task.permanent && (now - task.createdAt) >= maxAgeMs`.

Default `recurringMaxAgeMs` is 7 days. When triggered, the runtime:

1. Emits `tengu_scheduled_task_expired` with the task id and age hours.
2. Fires the task one final time.
3. Removes it from the store.

The model is told this in `buildCronCreatePrompt`: "Recurring tasks auto-expire after `DEFAULT_MAX_AGE_DAYS` (7) days — they fire one final time, then are deleted. Tell the user about the 7-day limit when scheduling recurring jobs."

## Related docs

- [Daemon and background service](../01-runtime-lifecycle/daemon-and-background-service.md)
- [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md)
- [Feature gates reference](../05-hosted-agent-ops/feature-gates-reference.md)
- [Slash commands and automation](slash-commands-and-automation.md)
- [Agents, tasks, and subagents](agents-tasks-and-subagents.md)
