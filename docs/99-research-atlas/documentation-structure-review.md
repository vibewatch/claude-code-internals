# Documentation structure and duplication review

This review audits the filename, title, scope, ownership, and overlap of every Markdown document in the Claude Code internals wiki. It complements the [full-system documentation coverage review](full-system-coverage-review.md): that review asks whether a runtime lifecycle lacks an owner; this review asks whether several pages claim the same owner or whether a filename promises the wrong content.

The review was performed on 2026-07-25 against the documentation for `@anthropic-ai/claude-code@2.1.215`. It is an information-architecture review, not a new package/source audit. `claude-code-pkg/` and `source-atlas/` remained read-only.

## Review method

The audit combined four kinds of evidence:

1. **Full section rereads** — all narrative, reference, generated-prompt, architecture, index, and audit-ledger pages were assigned to section-level reviews. The context/model review was completed directly after two independent review attempts timed out.
2. **Filename/title inventory** — every H1 was compared with its filename and parent section. Generic `architecture.md` names were evaluated in directory context rather than as root-level names.
3. **Content-overlap measurement** — a repository-wide scan compared substantive paragraphs, heading sets, and same-section TF-IDF token similarity while excluding standard source-anchor/related-doc boilerplate.
4. **Canonical-owner test** — each similar pair was classified as one of: harmful duplicate, architecture versus implementation, map versus reference, behavior versus schema, inventory versus lifecycle, generated artifact, or focused feature owner.

Exact duplicated paragraphs were not the deciding signal. Parallel pages can restate the same mechanism with different wording and still create competing ownership. Conversely, a small reference table can intentionally summarize a much deeper lifecycle page.

## Structural result

The wiki now has **63 canonical mechanism pages** across the six runtime domains. This is the union of the pages in the six final domain-audit manifests plus their recorded follow-ups, not the total number of Markdown files and not a suffix-based rule. Section guides, orientation pages, generated prompt artifacts, research records, and lookup-only references remain first-class documentation but are outside that mechanism count unless a domain ledger explicitly audited their behavior. For example, `settings-schema-reference.md` is counted because the tools/security follow-up audited its runtime configuration boundaries, while `command-line-reference.md` remains a lookup owner outside the runtime mechanism ledger.

| Domain | Canonical mechanism pages | Count manifest | Structure decision |
|---|---:|---|---|
| Runtime and startup | 10 | [Runtime audit scope](mechanism-question-audit-runtime.md#purpose-and-scope) plus its terminal follow-up | Retired one duplicate command narrative; routing and command inventory now have separate canonical owners. |
| Context and model loop | 8 | [Context/model audit scope](mechanism-question-audit-context-model.md#scope-and-exclusions) | Kept source discovery, assembly scenarios, compaction, model/provider, stream, and generated prompt artifacts separate. |
| Tools, integrations, and security | 15 | [Tools/security final convergence table](mechanism-question-audit-tools-security.md#final-convergence-result) | Retained the intentional map → inventory → behavior/deep-dive layers. |
| Sessions, persistence, and remote | 10 | [Sessions/remote audit scope](mechanism-question-audit-sessions-remote.md#scope-and-constraints) plus its string-surface follow-up | Kept lifecycle, API/storage inventory, and schema references separate; added a distinct remote-runner egress/sync/staging owner without merging it into hosted-session transport. |
| Operations and native support | 10 | [Operations/native audit scope](mechanism-question-audit-operations-native.md#scope-and-exclusions) plus its string-surface follow-up | Retained observability, maintenance, configuration references, consumer lifecycle, native-artifact analyses, and the independent enterprise gateway server. |
| Agents and automation | 10 | [Agents/automation final convergence table](mechanism-question-audit-agents-automation.md#final-convergence-result) plus messaging/Teams follow-ups | Narrowed the overbroad scheduling page to steering/interruption/completion and delegated task/cron/workflow concerns to their owners. |

The count decreased from 62 to 61 without losing a mechanism: `commands-and-flags.md` duplicated the routing narrative in `cli-main-paths.md` and the surface tables in `command-line-reference.md`.

A later independent [string-surface review](disassembled-string-surface-review.md) increased the count from 61 to 63 by promoting two lifecycle owners that the original theme-led inventory missed. This is not a reversal of the consolidation rule: both new pages have independent activation, state, authority, failure, and cleanup. Other discovered clusters were absorbed by existing owners.

## Changes made

### String-surface follow-up

The follow-up applied the same canonical-owner test to source-confirmed string clusters:

| Discovery | Structure decision |
|---|---|
| Enterprise `gateway --config` server | New [Enterprise gateway server](../05-hosted-agent-ops/enterprise-gateway.md) page. It is a standalone Bun/Postgres/OIDC/inference/policy/spend/OTLP server role, not another paragraph in client-side provider auth. |
| Remote agent proxy + working sync + `/uploads` + staged MCP | New [Remote-environment egress and file staging](../04-sessions-persistence-remote/remote-environment-egress-and-file-staging.md) page. These form one hosted-runner data plane but are not the hosted-session replay/control transport. |
| Plugin evaluation | Extended [Plugin lifecycle and configuration](../03-tools-integrations-security/plugin-lifecycle-and-configuration.md#plugin-evaluation-early-access); target resolution, suite execution, sandbox, grading, and reports are one plugin operational surface. |
| Persistent scoped Agent memory | Extended [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md#persistent-scoped-agent-memory); a separate page would compete with the existing memory-source owner. |
| Grove terms/privacy | Extended [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md#consumer-terms-and-privacy-policy-grove), with command/startup cross-links. |
| Prompt history, `adopt.json`, archive import, decision JSONL, MCP OAuth/XAA | Added focused sections to their existing input, daemon, transcript, diagnostics, and MCP owners. |

The two new filenames use mechanism noun phrases and state their non-equivalences up front. No page named only `gateway`, `proxy`, `memory`, or `eval` was introduced, because those terms already identify several unrelated client/server/runtime concepts.

### Runtime command documentation

`commands-and-flags.md` had no durable third contract:

- its process-role and print-fast-path prose repeated [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md);
- its flag and command-family tables were a shorter, less complete version of [Command-line reference](../01-runtime-lifecycle/command-line-reference.md); and
- its plugin details already had a focused owner in [Plugin lifecycle and configuration](../03-tools-integrations-security/plugin-lifecycle-and-configuration.md).

The page was retired. All live links now use:

| Reader question | Canonical owner |
|---|---|
| How does argv move through bootstrap, main, Commander, and a runtime mode? | [CLI main paths](../01-runtime-lifecycle/cli-main-paths.md) |
| Which root flags, subcommands, interactive commands, aliases, gates, and mode surfaces exist? | [Command-line reference](../01-runtime-lifecycle/command-line-reference.md) |

The historical runtime audit still names the retired file as an audited artifact, but labels the later consolidation rather than linking to a missing route; see [Runtime command documentation](#runtime-command-documentation) for the current owners.

### Agent execution documentation

The former `agent-runtime-scheduling-and-completion.md` mixed five owners: Agent model/concurrency, SDK/MCP task waiting, queue steering, terminal-state eviction, and cron/remote routines. It was replaced with [Agent steering, interruption, and completion](../06-agents-automation/agent-steering-interruption-and-completion.md).

The current ownership is:

| Concern | Canonical owner |
|---|---|
| Agent definitions, built-in roles, model precedence, launch concurrency, task protocols, delegation limits | [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) |
| Recipient resolution, target transports, acknowledgement, reply, completion edge | [Agent messaging and communication](../06-agents-automation/agent-messaging.md) |
| `now`/`next`/`later`, pending Agent input, interrupt, queued/control cancellation, stop markers, terminal notification/eviction | [Agent steering, interruption, and completion](../06-agents-automation/agent-steering-interruption-and-completion.md) |
| Roster, mailbox, shared task files, teammate claim/permission/shutdown | [Agent Teams](../06-agents-automation/agent-teams.md) |
| Deterministic FIFO-limited JavaScript orchestration | [Dynamic workflows](../06-agents-automation/dynamic-workflows.md) |
| Timed prompts, `/loop`, durable cron, jitter, missed tasks, remote routines | [Cron and scheduled tasks](../06-agents-automation/cron-and-scheduled-tasks.md) |

The Agent Teams page now delegates the generic `SendMessage` contract to the messaging owner and documents only team-specific restrictions.

### Session documentation

The session pages were not merged because they answer distinct lookup questions:

| Page | Retained contract |
|---|---|
| [Session and remote-control architecture](../04-sessions-persistence-remote/architecture.md) | Identity/layer model, collaborators, invariants, design decisions. |
| [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md) | Local persistence, discovery/restore, relocation, hydration/backfill, retention, and failure algorithms. |
| [Remote control and teleport](../04-sessions-persistence-remote/remote-control-and-teleport.md) | Bridge/hosted/teleport transport lifecycles, replay, reconnect, and teardown. |
| [Session API, events, and storage](../04-sessions-persistence-remote/session-api-events-and-storage.md) | Endpoint, event-family, frame-family, and storage-area inventory. |
| [Data models and frame schemas](../04-sessions-persistence-remote/data-models-and-frame-schemas.md) | Observable record/frame fields and schema-level ordering constraints. |
| [SDK query, session API, and subagent surface](../04-sessions-persistence-remote/sdk-query-and-session-api.md) | Public programmatic API and adapter contracts. |

Detailed queue timing, chunk thresholds, relocation steps, hydration guards, and backfill limits were removed from architecture/reference pages and retained in their lifecycle owners. This avoids creating one oversized “session everything” page while eliminating competing algorithm descriptions.

### Reader-facing operations name

The chapter previously displayed as “Hosted agent ops,” but most of its content concerns local diagnostics, telemetry, updates, safe-mode recovery, environment gates, the enterprise gateway, and native media artifacts. Its reader-facing title is now **Operations and native support**. The directory/route `05-hosted-agent-ops` remains stable to avoid broad link churn and broken external URLs.

### Source and catalog wording

Two content inconsistencies found during the structural reread were corrected:

- raw `cli.js` is now described as artifact identity, while reproducible `cli.renamed.js` is the primary behavioral reading surface;
- prompt assembly no longer claims that generated JSON is absent when `docs/99-research-atlas/data/prompt-catalog.json` is retained.

Two ownership links were also corrected: `/chrome` points to the Chrome lifecycle rather than macOS computer-use, and plugin command-handler modules point to plugin lifecycle rather than the retired command page.

## Pages intentionally kept separate

### Orientation and architecture

| Similar pages | Why they remain separate |
|---|---|
| Wiki home and `00-start-here/README.md` | Global multi-path navigation versus a linear beginner route. |
| Main feature map and system architecture | Capability discovery (“what exists?”) versus decomposition/data flow (“how is it organized?”). |
| System architecture and runtime communication protocols | Module/plane synthesis versus cross-cutting wire/protocol taxonomy. |
| Section `architecture.md` and focused implementations | Design invariants and collaborator boundaries versus executable call paths, failure details, and user surfaces. |

A generic `architecture.md` filename is acceptable inside each numbered domain directory because the directory supplies the missing subject and all H1s name the domain explicitly.

### Context, model, and prompts

| Similar pages | Why they remain separate |
|---|---|
| Prompt/context/memory and prompt assembly scenarios | Source inventory versus branch/order skeletons. |
| Prompt template catalog and `prompts/*.md` | Generated index/provenance versus full generated bodies. |
| Prompt-category shards | Regenerator-owned heuristic categories; merging would break stable generated outputs and make lookup worse. |
| Models/providers/auth and model selection/usage/quota/billing | Provider route/credential matrix versus model behavior, calls, accounting, limits, and billing UI. |
| Team memory and ordinary memory | Remote/multi-store synchronized mirrors have a separate control/data plane and safety model. |

The large generated prompt files are artifacts, not tutorials. Their category-style filenames match the extractor and should not be “prettified” independently of the generator.

### Tools, integrations, and security

| Similar pages | Why they remain separate |
|---|---|
| Tool runtime/events, tool inventory/schemas, built-in tools/permissions | Cross-cutting map, canonical name/schema lookup, and execution-boundary behavior. |
| MCP/plugins/hooks, plugin lifecycle/configuration, hooks/events reference | Runtime wiring, plugin state/install/config lifecycle, and canonical event lookup. |
| Settings/policy/integrations and settings schema reference | How settings load/merge/watch/write versus which roots/keys/sources exist. |
| Chrome, computer-use MCP, IDE/LSP | Different transport, trust, platform, lifecycle, and failure owners. |

### Operations and native support

| Similar pages | Why they remain separate |
|---|---|
| Diagnostics/debug logs and telemetry/tracing | Local support evidence versus external signal export and traffic gates. |
| Updater/doctor and safe mode/recovery | Maintenance/health commands versus startup customization isolation. |
| Feature gates and environment-variable reference | Decision logic versus operator-facing variable inventory. |
| Media native modules, audio capture/voice, audio native, image native | Payload inventory, consumer feature lifecycle, and per-binary artifact analysis. |
| Enterprise gateway and client gateway auth | Standalone operator server lifecycle versus developer CLI credential/provider routing. |

### Research atlas

The six `mechanism-question-audit-<domain>.md` filenames remain unchanged. Their type-first prefix groups all audit ledgers together in filesystem and route listings; each destination label and H1 carries the domain name. The ledgers record independent domain evidence and should not be merged into a single very large process document.

`full-system-coverage-review.md` and this page also remain separate: one is a source-coverage decision record; the other is a documentation ownership/naming decision record.

## Quantitative overlap result

Before restructuring, the highest same-section semantic-overlap candidates included:

| Pair | Approximate TF-IDF similarity | Decision |
|---|---:|---|
| `cli-main-paths.md` ↔ `commands-and-flags.md` | 0.427 | Harmful duplicate; retire the latter. |
| Session architecture ↔ session resume/transcripts | 0.378 | Keep architecture/lifecycle split, remove copied algorithms. |
| Session API/events/storage ↔ data models/frame schemas | 0.368 | Keep inventory/schema split, remove lifecycle detail. |
| Agent runtime/scheduling/completion ↔ agents/tasks/subagents | 0.277 | Rename/narrow the former and delegate model/task material. |

After restructuring, the leading pairs were:

| Pair | Approximate TF-IDF similarity | Interpretation |
|---|---:|---|
| Runtime architecture ↔ CLI main paths | 0.299 | Intentional architecture/implementation pair. |
| Settings behavior ↔ settings schema | 0.263 | Intentional behavior/reference pair. |
| Session API inventory ↔ session schemas | 0.253 | Intentional adjacent references with explicit handoff. |
| Session architecture ↔ resume/transcripts | 0.216 | Intentional architecture/lifecycle pair after thinning. |

Similarity is a triage signal, not a merge threshold. The post-change candidates have different reader contracts and explicit canonical-owner language.

## Naming rules going forward

1. Use a **mechanism noun phrase** for implementation pages (`terminal-ui-renderer-and-input`, `worktree-isolation-and-handoffs`).
2. Use `reference` or `schemas` only when the page is designed for lookup rather than lifecycle narration.
3. Keep section-level `architecture.md` files, but make the H1 and opening scope name the domain and link to implementation owners.
4. Do not create a broad page when an existing lifecycle owner can absorb the finding.
5. Do not copy algorithm steps into architecture, inventory, or schema pages; summarize invariants and link to the owner.
6. Keep generated filenames synchronized with their generators.
7. Prefer reader-facing title corrections over route churn when an established path has many inbound/external links.
8. Treat audit/history mentions of retired paths or superseded conclusions as historical records, not live navigation.

## Original structure-review validation

The metrics below describe the completed 61-page structure review before the later string-surface follow-up added three Markdown sources and two mechanism owners. They remain as historical evidence for that consolidation pass; current post-follow-up metrics are recorded separately after fresh validation.

- Three independent final reviews checked the global information architecture, command/agent consolidation, and session de-duplication. All substantive redesigns converged; the only material clarification was to make the mechanism-count manifests explicit.
- The final inventory contains **97 Markdown sources** with **97 unique H1 titles**. `docs/SUMMARY.md` resolves all **96** other page targets.
- All **2,191 authored relative Markdown targets** resolve across the 88 non-generated Markdown files. The nine generated prompt shards are validated as generated pages rather than as wiki link sources because their verbatim fenced prompt bodies intentionally contain example/pseudo-repository Markdown links.
- All **88** configured sidebar routes resolve to source pages with no duplicate route.
- The filename/title audit found only four low-overlap names, all expected section-scoped `architecture.md` files whose H1 supplies the domain. No unexplained filename/H1 mismatch remains.
- At that review point, the mechanism arithmetic was **10 + 8 + 15 + 9 + 9 + 10 = 61**. After the string-surface follow-up, the current arithmetic is **10 + 8 + 15 + 10 + 10 + 10 = 63**.
- `git diff --check` passed before the production build.
- Astro/Starlight loaded **97** docs and generated **98** static pages. Pagefind indexed all 98 HTML files and sitemap generation completed.
- Generated-route assertions confirmed that `/01-runtime-lifecycle/commands-and-flags/` and `/06-agents-automation/agent-runtime-scheduling-and-completion/` are absent, while the replacement agent page and this structure review are present with all referenced heading fragments.
- The build's only warning was Vite's existing advisory for chunks larger than 500 kB after minification.
- No retained package or `source-atlas/` artifact was intentionally edited.

## Remaining non-duplication caveats

- Similar terminology is unavoidable across architecture, reference, and implementation layers; explicit owner statements are the maintenance boundary.
- Generated prompt bodies intentionally contain repeated source text and embedded documentation. They are not included in narrative deduplication decisions.
- External links may still target the retired command route or old agent route. This static site does not currently define redirects; internal navigation has been updated to canonical pages.
- A later Claude Code package version can change mechanism ownership enough to require another review.
