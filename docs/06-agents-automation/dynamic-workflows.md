# Dynamic workflows

Dynamic workflows are Claude Code's deterministic multi-agent orchestration layer. The `Workflow` tool runs a JavaScript control program that can fan out, pipeline, verify, and synthesize work across many subagents while the parent session remains usable.

A workflow is not a second model loop. It reuses the normal agent registry, models, effort levels, MCP tools, permission boundary, task registry, transcript storage, hooks, and telemetry. The difference is that control flow is explicit JavaScript rather than repeated model decisions.

## Source anchors

| Semantic alias | String or symbol | Meaning |
|---|---|---|
| WorkflowTool | `Execute a workflow script that orchestrates multiple subagents deterministically` | Model-visible tool contract at approximately `cli.renamed.js:388997`. |
| WorkflowEnablement | `enableWorkflows`, `disableWorkflows`, `CLAUDE_CODE_DISABLE_WORKFLOWS` | User, policy, and environment availability controls. |
| UltracodeTrigger | `workflowKeywordTriggerEnabled`, `ultracode` | Keyword opt-in and standing xhigh-effort workflow mode. |
| WorkflowInput | `script`, `name`, `scriptPath`, `args`, `resumeFromRunId` | Inline, saved, edited, parameterized, and resumed invocation forms. |
| WorkflowRuntime | `agent`, `pipeline`, `parallel`, `phase`, `log`, `budget`, `workflow` | Globals exposed inside the deterministic VM. |
| WorkflowBackgroundResult | `status: "async_launched"`, `taskType: "local_workflow"` | Tool returns immediately with task/run/transcript/script identifiers. |
| WorkflowView | `/workflows` | Live/history UI and stop surface for workflow runs. |
| WorkflowPersistence | `journal.jsonl`, `resumeFromRunId`, `scriptSha256` | Persisted execution journal and content-pinned resume contract. |
| WorkflowTelemetry | `workflow.run_id`, `workflow.name`, `tengu_workflow_launched`, `tengu_workflow_completed` | Correlation attributes and lifecycle signals. |

## Explicit opt-in

Workflows can spawn many agents and consume substantial tokens, so the tool prompt requires explicit user intent. A run is authorized conceptually when the user:

- asks for a workflow, multi-agent orchestration, or agent fan-out;
- names a saved workflow;
- invokes a skill/command whose instructions call `Workflow`;
- includes the enabled `ultracode` keyword; or
- has standing ultracode mode enabled for the session.

A task merely being large or parallelizable is not opt-in. Without explicit intent, the model should use individual `Agent` calls or ask before escalating to a workflow.

`/effort ultracode` is session-only: it selects `xhigh` effort plus standing workflow orchestration. It requires workflows to be enabled and a model that supports `xhigh`. `workflowKeywordTriggerEnabled: false` disables only the keyword trigger, not direct workflow requests.

## Invocation forms

| Input | Behavior |
|---|---|
| `script` | Runs a self-contained inline JavaScript workflow. The runtime persists it under the session directory. |
| `name` | Resolves a built-in, user, project, or plugin workflow. |
| `scriptPath` | Reads an edited workflow from disk; takes precedence over inline script/name. |
| `args` | Exposes any JSON value verbatim as the script-global `args`. Arrays/objects must not be pre-stringified. |
| `resumeFromRunId` | Replays an earlier run's unchanged agent-call prefix from its journal and runs only changed/new calls. |

The tool validates syntax and metadata before launch. Permission evaluation defaults to `ask` with a workflow preview; `Workflow(name)` allow/ask/deny rules can target saved workflows. Managed `disableWorkflows` or organization policy can reject the call before permission evaluation.

## Script contract

Every script starts with a pure-literal metadata export:

```js
export const meta = {
  name: 'review-changes',
  description: 'Review changed files and verify findings',
  phases: [
    { title: 'Review' },
    { title: 'Verify' },
  ],
}
```

`name` and `description` are required. `whenToUse` and `phases` are optional. Metadata cannot use variables, calls, spreads, or template interpolation, which lets discovery render a trustworthy description without executing the workflow.

The body is plain JavaScript, not TypeScript. It runs in a restricted `vm` context with string/Wasm code generation disabled and no Node.js/filesystem APIs. `Date.now()`, `Math.random()`, and argument-less `new Date()` are rejected because nondeterminism would break journal replay; callers pass timestamps or seeds through `args` instead.

## Runtime globals

| Global | Contract |
|---|---|
| `agent(prompt, options?)` | Spawns one subagent. It inherits the session model/effort unless overridden; optional JSON Schema returns a validated object; `isolation: "worktree"` isolates parallel mutations. |
| `pipeline(items, ...stages)` | Default multi-stage primitive. Each item advances independently with no barrier between stages. |
| `parallel(thunks)` | Barrier primitive. Runs thunks concurrently and returns after all settle; failed/skipped entries become `null`. |
| `phase(title)` | Assigns subsequent calls to a progress group. Explicit `agent(..., {phase})` avoids shared-state races inside pipelines. |
| `log(message)` | Emits a narrator/progress line. |
| `budget` | Shared turn token target: `total`, `spent()`, and `remaining()`. Further agent calls fail once a configured hard target is exhausted. |
| `workflow(nameOrRef, args?)` | Runs one saved/script-path child inline. The child shares concurrency, agent count, abort signal, and token budget. Child nesting is limited to one level. |

`pipeline` is preferred when later work depends only on the same item's prior stage. `parallel` is appropriate when a stage genuinely needs the complete prior result set (for example, global deduplication before verification).

## Limits and sizing

The workflow runtime bounds fan-out independently of the session-wide `Agent` budget:

- Concurrent workflow agents: `min(16, CPU cores - 2)`; excess calls queue.
- Lifetime agent backstop per workflow: 1,000.
- Maximum items accepted by one `parallel`/`pipeline`: 4,096.
- Nested child workflows: one level.
- Captured workflow log lines: 1,000.

`workflowSizeGuideline` is advisory rather than enforcement: `small` aims below 5 agents, `medium` below 15, and `large` below 50; `unrestricted` removes the hint. A user's prompt can override the guideline. `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS` and `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS` tune warning thresholds.

The separate session-wide `Agent` cap defaults to 200 and is controlled by `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`.

## Background lifecycle and progress

A successfully compiled call registers a `local_workflow` task, returns `async_launched` immediately, and continues in the background. The result includes a task ID, workflow run ID, transcript directory, and persisted script path. `/workflows` renders phase/agent progress and can stop an active run; completion or failure arrives through the normal task-notification queue.

One failure result has a misleading shape: after metadata/input validation, a later JavaScript compile failure can return `status: "async_launched"` together with allocated task/run IDs and an `error`. That branch returns before the runtime registers or starts the `local_workflow`; no agents run, and the renderer explicitly says the workflow “was not launched.” Callers must therefore treat the `error` field—not the status label alone—as authoritative for this branch.

Each workflow agent contributes token/tool/duration state to the workflow task. Completion records include status, result/error, agent count, failures, log preview, token/tool totals, duration, phase progress, and the script/run identity. Workflow-spawned telemetry carries `workflow.run_id` and optional `workflow.name` so a run can be reconstructed across agent events.

Remote workflows are different: they run against a fresh clone of the pushed branch, return a remote session URL, and show phase progress at that URL rather than in the local `/workflows` view.

## Discovery and precedence

Saved workflows are `.js` files with valid metadata. The runtime discovers:

- built-in workflows;
- user workflows under the Claude config `workflows/` directory;
- project/nested `.claude/workflows/` directories; and
- plugin default/custom workflow paths.

Project definitions override user definitions with the same name; plugin names are qualified and are suppressed when a user/project definition already owns that name. Built-ins fill names not supplied by those sources. Non-JavaScript, oversized, unreadable, or invalid-metadata files are skipped with diagnostics.

## Resume and integrity

Every invocation persists its script and a `journal.jsonl` containing actual agent return values. `resumeFromRunId` compares ordered agent calls by prompt/options: the longest unchanged prefix returns cached values immediately, and execution resumes at the first changed/new call.

Resume is same-session and content-pinned. A still-running prior task must be stopped first. Adopted background runs verify the script SHA-256; if the file changed after approval, the runtime requires a fresh `Workflow` invocation so the user can review the new script. This prevents unattended resume from executing unapproved edits.

## Failure modes

| Failure | Runtime behavior |
|---|---|
| Invalid metadata or JavaScript | Metadata/input validation can reject the call. A later compile failure can return an error-bearing `async_launched`-shaped result, but it returns before task registration or launch; no agents run. |
| Nondeterministic API use | Validation rejects the script before launch. |
| Agent failure/skip | `agent` returns `null`; `parallel`/`pipeline` preserve a `null` slot so the script can filter or handle it. |
| Token/agent/item cap | Further fan-out throws an explicit limit error rather than silently truncating coverage. |
| Unknown workflow or unreadable path | Resolution fails with available names or a path error. |
| Script changed during adopted resume | SHA mismatch rejects resume and requires re-approval. |
| User stops run | Abort propagates to the workflow and agents; task status becomes killed/stopped. |

## Related docs

- [Agents, tasks, and subagents](agents-tasks-and-subagents.md)
- [Agent runtime, scheduling, and completion](agent-runtime-scheduling-and-completion.md)
- [Cron and scheduled tasks](cron-and-scheduled-tasks.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Hooks and events reference](../03-tools-integrations-security/hooks-and-events-reference.md)
- [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md)
