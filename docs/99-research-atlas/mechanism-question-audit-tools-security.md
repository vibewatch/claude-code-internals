# Mechanism-question audit: tools, integrations, and security

This ledger records the full-analysis reverse-engineering audit of ten mechanism-oriented pages under `docs/03-tools-integrations-security`. It records the reader questions used to test each page, the source-confirmed answers, the resulting documentation decision, and the evidence boundary beyond which the retained artifacts do not support a claim.

## Scope and exclusions

Audited pages:

1. [`architecture.md`](../03-tools-integrations-security/architecture.md)
2. [`artifact-publishing-and-live-pages.md`](../03-tools-integrations-security/artifact-publishing-and-live-pages.md)
3. [`built-in-tools-and-permissions.md`](../03-tools-integrations-security/built-in-tools-and-permissions.md)
4. [`claude-design-and-design-sync.md`](../03-tools-integrations-security/claude-design-and-design-sync.md)
5. [`computer-use-mcp.md`](../03-tools-integrations-security/computer-use-mcp.md)
6. [`mcp-plugins-hooks.md`](../03-tools-integrations-security/mcp-plugins-hooks.md)
7. [`sandbox-and-isolation.md`](../03-tools-integrations-security/sandbox-and-isolation.md)
8. [`settings-policy-and-integrations.md`](../03-tools-integrations-security/settings-policy-and-integrations.md)
9. [`skills-system.md`](../03-tools-integrations-security/skills-system.md)
10. [`tool-runtime-events-and-integrations.md`](../03-tools-integrations-security/tool-runtime-events-and-integrations.md)

Excluded from direct editing were the section `README.md`, navigation and index files, inventories and schema references, generated artifacts and source atlases, website configuration, unrelated sections, and unrelated research ledgers. The three audited pages that already answered their source-answerable mechanism questions were intentionally left unchanged rather than churned.

## Artifact identity and evidence model

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code@2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Primary behavioral view | [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) — SHA-256 `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` |
| Normalized corroborating view | [`cli.formatted.js`](../../claude-code-pkg/src/entrypoints/cli.formatted.js) — SHA-256 `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` |
| Raw retained entrypoint | [`cli.js`](../../claude-code-pkg/src/entrypoints/cli.js) — SHA-256 `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` |
| Audit host | Linux x86-64 |

The three JavaScript files are different views of one retained artifact, not three independent implementations. Behavioral claims were established from enclosing control flow in the semantic view and checked against the normalized/raw views when transformation or identity mattered. Schemas, error strings, and generated prompt text were treated as leads until a runtime call path established their meaning. Existing docs supplied reader questions, not proof.

Approximate bundle lines are build-specific navigation aids. Exact strings/symbols and the enclosing branch are the evidence. `source-atlas/` was intentionally left untouched because the readable bundle supplied the needed control flow and this audit did not request regeneration.

## Question and convergence method

For each page:

1. Read the current page and its relevant neighboring pages.
2. Ask zero to ten genuine reader questions about identity, ordering, permission, failure, persistence, cleanup, concurrency, and edge cases that the page did not yet answer clearly.
3. Trace each question through focused `cli.renamed.js` control flow and corroborate it in `cli.formatted.js`, `cli.js`, or adjacent retained artifacts where useful.
4. Patch only source-confirmed omissions or overclaims, preserving explicit unknowns.
5. Re-read the resulting page and ask only **new** questions introduced or still left unanswered by the prose.
6. Declare convergence only after one complete pass over all ten pages yields zero new source-answerable mechanism questions.

“Zero new questions” does not mean every implementation detail is known. It means every remaining material question requires unavailable server code, an external/native implementation, platform behavior not present on the audit host, runtime observation, or a different artifact—and is retained below as an evidence limit rather than guessed.

## Cross-cutting source findings

| Mechanism question | Source-confirmed answer | Representative anchors |
|---|---|---|
| Does one model response execute all tool calls concurrently? | No. Only contiguous schema-valid calls whose tools report `isConcurrencySafe` coalesce into parallel blocks. Invalid or unsafe calls are singleton ordering barriers. A positive `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` overrides the default block cap of `10`. | `K3g`, `Y3g`, `J3g`, `X3g` [~343,251–343,333](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L343251) |
| When can rewritten tool input execute? | Original input is parsed/coerced and tool-validated first. A `PreToolUse.updatedInput` has its own hook-path check. A later permission replacement is independently checked by `n8u`; an invalid replacement returns `PERMISSION_UPDATED_INPUT` before `tool.call`. | `mYr` [~398,297](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L398297); `n8u`/`Yny` [~425,217–425,805](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L425217) |
| Does every denial dispatch `PermissionDenied`, and does `retry: true` rerun the call? | No. The observed dispatch is specific to the final auto-mode classifier denial branch. `retry: true` appends model-visible guidance; the boundary does not reschedule the denied call. | `Yny` and exact retry text [~425,234–425,765](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L425234) |
| When do post-tool hooks run? | Success/failure hooks run per call and may overlap inside a parallel block. Normal-loop `PostToolBatch` runs after settled results and can add context or stop the next model continuation. The observed end-turn path still emits it, but discards block/prevent-continuation output because no next model request remains. | `executePostToolBatchHooks` [~462,430](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L462430); end-turn `Fmy` [~459,780](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L459780) |
| Is a marketplace declaration the same as an acquired marketplace? | No. Scoped `extraKnownMarketplaces` declarations and materialized `known_marketplaces.json` records have separate owners and writes. Add materializes first and declares second; scoped removal can preserve state/plugins while another scope, policy, or seed still owns the name. | `sQ`, `Uhy`, `bJr`, `Ng`, `lxe` [~466,724–466,820](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L466724); `cct`, `DDt` [~467,677–467,850](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L467677) |
| Which marketplace source types actually materialize? | URL, GitHub, generic Git, local file, local directory, and settings-backed synthetic manifests have implementation branches. The recognized `npm` marketplace branch explicitly throws `NPM marketplace sources not yet implemented`. Npm **plugin packages** are a separate supported cache source. | `bSs` [~467,471–467,675](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L467471) |
| When and how are embedded bundled-Skill files written? | Lazily on first invocation, with a memoized extraction promise. Paths are kept below the bundled root, directories use mode `0700`, first-write files use exclusive creation and mode `0600`, and `O_NOFOLLOW` is added only where the platform constant exists. | `Lu`, `klt`, `Zry`, `vzu`, `mhs`, `rny`, `nny` [~421,026–421,174](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421026) |
| Can a malformed later `teach_batch` step fail after earlier steps execute, and do screenshots rebase coordinates mid-batch? | Every step envelope and anchor is normalized before any step executes, so an invalid envelope prevents the batch from starting. Action-specific failures can still occur after earlier actions. All batch coordinates use the pre-batch screenshot frame; callers use the returned final screenshot for the next batch. | `cQu`, `uQu`, `handleTeachBatch` [~450,752–450,900](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L450752); embedded schema [~452,145](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L452145) |

## Per-page question rounds

### `architecture.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What order separates initial input validation, hook rewrites, permission merging, final replacements, and execution? | Initial parse/coercion plus `validateInput` precedes `PreToolUse`; the hook replacement is checked in its own path; permission resolution follows; a final permission replacement is independently checked by `n8u` before `tool.call`. | Added the staged execution boundary to anchors, diagrams, and trust-pipeline prose. |
| Does every tool call in one response run concurrently? | No. Only adjacent valid/concurrency-safe calls coalesce; unsafe/invalid calls are serial barriers. Default parallel cap is `10`. | Added scheduler architecture and hook-timing implications. |
| Does every denial invoke `PermissionDenied` or automatically retry? | No. Only the observed auto-mode classifier denial reaches that branch; its retry flag is guidance only. | Narrowed the event claim and documented ordinary denial behavior. |
| Is `PostToolBatch` blocking behavior identical at normal continuation and end-turn? | No. It can stop normal continuation, but end-turn block/prevent output is discarded. | Added branch-specific ordering and an abort/exception caveat. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. The page now states the capability-boundary ordering without universalizing exceptional termination paths. **Status: edited and converged.**

### `artifact-publishing-and-live-pages.md`

#### Round 1

Zero genuine source-answerable gaps were found. The page already answers availability gates, local-read and hosted-write boundaries, stable path/URL identity, version conflict handling, transcript restoration, live-update monitoring, file limits, and individually gated optional features.

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Server-side storage, sharing propagation, and hosted conflict internals remain outside the local artifact and are not inferred. **Status: unchanged and converged.**

### `built-in-tools-and-permissions.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Are all `updatedInput` values validated by one generic hook guard? | No. Initial input, `PreToolUse` rewrite, `PermissionRequest` rule guard, and final permission replacement are distinct stages. | Added a four-stage rewrite/validation explanation and the `PERMISSION_UPDATED_INPUT` failure boundary. |
| Can a permission replacement reach the tool body merely because an earlier rewrite passed? | No. `n8u` checks the final replacement independently and returns before `tool.call` on failure. | Made the non-inheritance guarantee explicit. |
| Which denials dispatch `PermissionDenied`? | The observed branch requires an auto-mode classifier denial; other denial classes still return normal denial output/frame. | Replaced event-name-based generalization with branch-specific behavior. |
| Does `retry: true` schedule execution? | No. It adds a model-visible hint for a later decision. | Clarified that no scheduler retry occurs. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Specialized descriptors and permission-mode material remain consistent with the common boundary. **Status: edited and converged.**

### `claude-design-and-design-sync.md`

#### Round 1

Zero genuine source-answerable gaps were found. The page already distinguishes discovery-driven `ClaudeDesign` from fixed-schema `DesignSync`, traces authentication and consent, separates durable grants from path-scoped plans, states reserved-path and local-file guards, and limits claims about the bundled workflow versus runtime enforcement.

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Server-side project consistency, grant storage, and collaborative conflict behavior are not available in the client artifact. **Status: unchanged and converged.**

### `computer-use-mcp.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does `teach_batch` validate and execute each step in one interleaved loop? | No. `handleTeachBatch` normalizes every step through `cQu` first, then executes normalized steps through `uQu`. | Added the two-phase teaching-batch lifecycle. |
| Can malformed step metadata produce partial execution? | No. An invalid envelope/anchor prevents all execution; action-specific runtime failures may still follow earlier completed actions. | Added the exact atomicity boundary. |
| Which screenshot frame supplies anchors and click coordinates? | The screenshot held before the batch; intermediate screenshots do not rebase later steps. | Added pre-batch coordinate semantics and next-batch guidance. |
| Does a tooltip-only successful batch always take a final screenshot? | No. A final screenshot is returned only when at least one step contained actions. | Added the no-action success edge case. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Native macOS behavior beyond the readable boundary and non-macOS implementations remain explicitly unclaimed. **Status: edited and converged.**

### `mcp-plugins-hooks.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is `extraKnownMarketplaces` the acquired marketplace database? | No. It is scoped declaration state; `known_marketplaces.json` is separately validated materialized state. | Added the two-layer lifecycle and owners. |
| What is the add ordering, and is it transactional? | The handler materializes via `cct` and then writes the declaration via `bJr`; no rollback of materialized state is visible if the later settings write fails. | Added add ordering and its failure boundary. |
| Which source types actually acquire a marketplace? | URL, GitHub, Git, file, directory, and settings-backed manifests are implemented; NPM marketplace acquisition throws. | Resolved the prior marketplace gap and retained the explicit NPM limitation. |
| Does removing one scope always delete cache and plugins? | No. Other editable scopes, managed policy, or a seed can retain ownership. Final removal performs state/cache/plugin cleanup. | Added scoped versus final removal behavior. |
| Is npm plugin-package support evidence for npm marketplace support? | No. They are separate materializers; only plugin-package acquisition supports npm in this build. | Added an explicit namespace distinction. |
| What do named versus unnamed marketplace updates do? | Named update refreshes one entry; no name updates all eligible entries, with source/policy-specific skips. | Added targeted/all update behavior and telemetry. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Remote repository semantics and update atomicity beyond visible client writes remain unclaimed. **Status: edited and converged.**

### `sandbox-and-isolation.md`

#### Round 1

Zero genuine source-answerable gaps were found. The page already distinguishes permission approval from OS isolation; Linux/WSL from macOS wrappers; availability fallback from strict mode; network, filesystem, credential, and env-scrub policy; conditional seccomp/dependency behavior; and the external `@anthropic-ai/sandbox-runtime` evidence boundary.

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Native/external runtime internals, unsupported-platform behavior, and host-dependent enforcement remain explicit limits. **Status: unchanged and converged.**

### `settings-policy-and-integrations.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does a marketplace settings declaration prove an acquired cache exists? | No. `extraKnownMarketplaces` and `known_marketplaces.json` are separate layers. | Added declaration/materialization ownership and trust behavior. |
| When do project/local marketplace declarations participate? | The effective set excludes them before workspace trust; they join after trust. | Added the trust-sensitive merge boundary. |
| What does scoped removal preserve? | State/cache/plugins remain while another scope, policy, or seed owns the name; final removal cleans them. | Added scoped/final removal consequences. |
| Does the settings schema's npm source variant prove runtime support? | No. `bSs` throws for NPM marketplace acquisition. | Added the schema-versus-implementation caveat. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. The page now keeps policy, settings declarations, and local state distinct. **Status: edited and converged.**

### `skills-system.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Are bundled embedded files extracted during registration? | No. `Lu` defers extraction until first prompt invocation and memoizes the promise. | Added the lazy extraction lifecycle. |
| Can an embedded path escape its skill directory? | `nny` rejects absolute paths and `..` segments before joining under the bundled root. | Added the containment rule. |
| Can first extraction silently overwrite an existing file? | No. `rny` uses create/write/exclusive flags and mode `0600`; directories use `0700`. | Added exclusive-create and mode behavior. |
| Is symlink no-follow enforcement universal? | No. `O_NOFOLLOW` is included only if the platform exposes the constant (`O_NOFOLLOW ?? 0`). | Added the platform-conditional caveat. |
| Does tolerated `EEXIST` on an additional-file path weaken initial extraction? | No. That behavior belongs to separate `mhs` handling; first extraction remains exclusive. | Distinguished the two write paths. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Filesystem guarantees beyond the shown flags and host semantics remain unclaimed. **Status: edited and converged.**

### `tool-runtime-events-and-integrations.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| How are calls from one model response scheduled around unsafe or invalid calls? | Adjacent safe calls form bounded parallel blocks; invalid/unsafe calls form serial singleton barriers. | Added scheduler anchors, flow, and default/override cap. |
| Can per-call post hooks overlap, and when does the aggregate hook run? | Per-call hooks can overlap within a parallel block; aggregate `PostToolBatch` follows settled results. | Added per-call versus aggregate timing. |
| Can end-turn `PostToolBatch` still stop continuation? | No next request remains; block/prevent output is logged as discarded, though hook messages can emit. | Added normal-loop versus end-turn semantics. |
| Are denial and rewrite claims consistent with the permission page? | Yes: only auto-mode classifier denial reaches the observed `PermissionDenied` branch, retry is guidance, and final replacement validation is independent. | Updated the synthesis map and permission flow. |
| What marketplace lifecycle should the integration map point to? | Declaration, materialization, update, and scoped/final removal are implemented; NPM marketplace acquisition is not. | Replaced the stale future-gap note with a resolved cross-link and retained limitation. |

#### Round 2 — convergence

Zero new source-answerable mechanism questions. LSP feature breadth, provider-side WebSearch, and exceptional termination paths remain explicitly bounded. **Status: edited and converged.**

## Evidence-limited questions retained

The following are not answered because the inspected local artifacts do not establish them safely:

1. **Provider/server internals:** hosted Artifact storage, marketplace hosting behavior, Claude Design collaboration/conflict handling, hosted connector catalogs, and provider-side WebSearch execution.
2. **External/native implementations:** internals of `@anthropic-ai/sandbox-runtime`, macOS computer-use native code beyond its readable wrapper, and OS enforcement guarantees not visible in the JavaScript path.
3. **Exceptional termination completeness:** the normal model-loop and observed end-turn `PostToolBatch` branches are known; no claim is made that every abort/crash path dispatches equivalent hooks.
4. **Filesystem portability:** exclusive-create and mode flags are source-visible, but filesystem/OS semantics vary; `O_NOFOLLOW` is explicitly conditional.
5. **Marketplace transactions and remote consistency:** add's materialize-then-declare writes are visible, but no general crash transaction, repository consistency guarantee, or remote rollback is inferred.
6. **Future NPM marketplace behavior:** the schema recognizes the source kind, but the current materializer throws. No future design is inferred from that schema.
7. **Server-side policy/rollout:** bundle presence does not prove availability to every account, organization, provider, platform, or feature-gate cohort.

## Final convergence result

A complete post-edit pass over all ten in-scope pages produced **zero new source-answerable mechanism questions**.

| Page | Documentation decision | Final pass: new source-answerable questions | Status |
|---|---|---:|---|
| `architecture.md` | Edited | 0 | Converged |
| `artifact-publishing-and-live-pages.md` | Unchanged | 0 | Converged |
| `built-in-tools-and-permissions.md` | Edited | 0 | Converged |
| `claude-design-and-design-sync.md` | Unchanged | 0 | Converged |
| `computer-use-mcp.md` | Edited | 0 | Converged |
| `mcp-plugins-hooks.md` | Edited | 0 | Converged |
| `sandbox-and-isolation.md` | Unchanged | 0 | Converged |
| `settings-policy-and-integrations.md` | Edited | 0 | Converged |
| `skills-system.md` | Edited | 0 | Converged |
| `tool-runtime-events-and-integrations.md` | Edited | 0 | Converged |

Cross-page terminology now consistently preserves these boundaries:

- contiguous, bounded safe-call concurrency rather than universal parallelism;
- separate initial, pre-hook, and final permission-input validation;
- auto-mode-classifier-specific `PermissionDenied` dispatch and model guidance rather than automatic retry;
- per-call post hooks versus normal/end-turn aggregate-hook semantics;
- marketplace declaration state versus materialized state and final ownership cleanup;
- npm plugin packages versus unsupported NPM marketplace acquisition;
- lazy, contained, exclusive bundled-file extraction with conditional no-follow support;
- all-step teaching-envelope normalization and pre-batch coordinate framing.

## Validation

- Editor diagnostics reported no errors in all ten audited pages or this ledger.
- A targeted relative-link check resolved 178 Markdown targets across the eleven audit files.
- `git diff --check` passed.
- The Astro/Starlight production build loaded 86 source docs and generated 87 static pages, including `/99-research-atlas/mechanism-question-audit-tools-security/`. The only warning was the existing Vite large-chunk advisory.
- Allowed-file accounting identified exactly seven modified in-scope mechanism pages plus this new ledger. Pre-existing/concurrent working-tree changes in other documentation sections and their three ledgers were enumerated and excluded rather than modified.
- No navigation, README, summary, website configuration, generated artifact, extracted bundle, or source-atlas file was changed by this audit.

**Audit status: complete and converged for Claude Code `2.1.215` on the inspected retained artifacts.**
