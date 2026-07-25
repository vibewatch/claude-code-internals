# Mechanism-question audit: tools, integrations, and security

This ledger records the original full-analysis reverse-engineering audit of ten mechanism-oriented pages under `docs/03-tools-integrations-security` plus later focused [`status-line.md`](../03-tools-integrations-security/status-line.md) and [`plugin-lifecycle-and-configuration.md`](../03-tools-integrations-security/plugin-lifecycle-and-configuration.md) follow-ups. It records the reader questions used to test each page, the source-confirmed answers, the resulting documentation decision, and the evidence boundary beyond which the retained artifacts do not support a claim.

## Scope and exclusions

Original audited pages:

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

Focused follow-up pages:

11. [`status-line.md`](../03-tools-integrations-security/status-line.md)
12. [`plugin-lifecycle-and-configuration.md`](../03-tools-integrations-security/plugin-lifecycle-and-configuration.md)
13. [`browser-automation-and-claude-in-chrome.md`](../03-tools-integrations-security/browser-automation-and-claude-in-chrome.md)
14. [`ide-integration-and-lsp-diagnostics.md`](../03-tools-integrations-security/ide-integration-and-lsp-diagnostics.md)

For the original ten-page audit, excluded from direct editing were the section `README.md`, navigation and index files, inventories and schema references, generated artifacts and source atlases, website configuration, unrelated sections, and unrelated research ledgers. The three original pages that already answered their source-answerable mechanism questions were intentionally left unchanged rather than churned.

The focused status-line follow-up intentionally updated its section index, settings/hook references, safe-mode/ops handoffs, global navigation, website sidebar, and this ledger. The later plugin/configuration follow-up created the focused plugin page; revisited the settings and MCP owners plus the settings schema reference; and updated navigation, indexes, and this ledger. Generated artifacts, the retained bundle, and `source-atlas/` remained excluded.

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

Zero genuine source-answerable gaps were found in the original Artifact-tool pass. A later command follow-up added the command/bundled-skill layer without changing those tool conclusions.

#### Round 2 — convergence

Zero new source-answerable mechanism questions. Server-side storage, sharing propagation, and hosted conflict internals remain outside the local artifact and are not inferred. **Status: edited in command follow-up and converged.**

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

#### Round 3 — Windows follow-up

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does the current artifact still limit command sandboxing to Linux/WSL and macOS? | No. `Qnt()` enables a Windows path when `CLAUDE_CODE_NANKEEN_KESTREL` or `tengu_nankeen_kestrel` is active. `isSupportedPlatform_2()` and dependency checks then accept Windows. | Replaced the stale unsupported-Windows caveat with the gated availability boundary. |
| What enforces the Windows sandbox? | One-time `srt-win install` provisions `ClaudeCodeSandbox` and WFP filters. Initialization verifies the dedicated user/WFP fence, applies session-wide grant/deny ACL operations, and starts the common filtered proxy. | Added the Windows installation, filesystem, network, TLS, and cleanup lifecycle. |
| How are Windows commands wrapped? | `wrapWithSandbox()` explicitly rejects Windows; `wrapWithSandboxArgv()` emits `srt-win exec` argv/env/unset-env data, and the shell executor performs a non-shell spawn for PowerShell or Git Bash. | Added the platform-specific execution branch and shell requirements. |
| Which Windows limits differ from Unix? | Per-exec allow paths are unsupported, filesystem-policy updates require reset/reinitialize, TLS termination needs a persistently trusted CA, and assembled argv is bounded below `CreateProcessW`'s limit. | Added source-visible failure and reconfiguration boundaries. |

Representative anchors: Windows gate [~242,468](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L242468); installer/status/ACL [~231,845-232,050](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L231845); runtime initialize/wrap/reset [~232,350-233,000](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L232350); Claude Code manager and config conversion [~243,300-244,300](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L243300); shell spawn selection [~328,650-328,760](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L328650).

#### Round 4 — convergence

The post-edit reread produced zero new source-answerable mechanism questions. Native `srt-win.exe`, Windows kernel/WFP internals, and actual feature rollout remain explicit evidence limits. **Status: edited in follow-up and converged.**

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

### `status-line.md` — focused follow-up

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is `/statusline` the component that reruns and renders the command? | No. It is an interactive, user-only setup prompt that delegates to `statusline-setup`; the TUI later calls `executeStatusLineCommand()` directly. | Created a focused page that separates setup from deterministic runtime execution. |
| What is sent to the command? | `pNb()` builds one JSON object with session/transcript identity, model, current/original workspace paths, origin/worktree metadata, version/output style, cumulative cost/edit counters, current context usage, fast/thinking/effort, rate limits, Vim mode, agent, remote, PR, and worktree-session fields. | Added a field-by-field stdin protocol reference and clarified optional/undefined fields. |
| What schedules refreshes? | Mount and command changes run immediately; selected message/usage/mode/model/PR state changes use a 300 ms debounce; optional `refreshInterval` adds periodic runs. Each run samples cwd/repository metadata, but those fields are not all independent dependencies. | Added exact trigger/cadence and sampled-versus-triggering distinctions. |
| Can refreshes overlap or overwrite newer output? | A new run aborts the prior controller before spawning. Aborted stale results do not update `statusLineText`; shared process cleanup terminates the child tree, though the new spawn does not await every OS cleanup step. | Documented stale-result suppression without claiming impossible brief process overlap. |
| Does the command cross ordinary tool permissions or the Bash sandbox? | No. After policy/trust checks it is a direct child-process shell spawn through shared hook-command infrastructure. It does not call the Bash permission classifier or `SandboxManager`. | Added the no-per-refresh-prompt and non-sandboxed local-extension boundary. |
| Which environment, cwd, and timeout apply? | `subprocessEnv()` plus Claude child/session/project/terminal variables; current cwd with original-cwd fallback; platform shell/Git Bash/PowerShell branches; fixed shared 600,000 ms timeout. | Added platform and process-boundary tables while avoiding a claim that every inherited secret is stripped. |
| How is stdout interpreted? | Only exit-0 stdout is accepted; whole output and each line are trimmed, blank lines are dropped, and remaining lines are dimmed/truncated. Multiline rendering carries SGR and OSC 8 state. Empty/failing output clears the custom line; stderr is debug-only. | Added normalization, rendering, and failure semantics. |
| Is status-line output capped by the generic task-output spill threshold? | Not in the traced return path. `Kxo()` separately accumulates stdout used by `executeStatusLineCommand()`; no small status-specific cap was found even though the renderer truncates visually. | Recorded a bounded-output recommendation and retained the absence of a cap as version-specific evidence, not a contract. |
| How do safe mode, managed-only mode, `disableAllHooks`, and trust compose? | Safe mode and managed-only resolution select `policySettings.statusLine`; non-policy merged `disableAllHooks` also enters managed-only resolution; managed-policy `disableAllHooks: true` stops execution; project-scope trust remains required. | Added a policy matrix and linked the existing safe-mode explanation. |
| Is `subagentStatusLine` the same protocol? | No. It sends task-array JSON on serialized five-second ticks with a five-second timeout, accepts `{id,content}` JSONL, and replaces/hides individual task rows. Main `statusLine` accepts plain/ANSI stdout and cancels stale refreshes. | Added a separate payload, schedule, output, fallback, and rendering section. |

Representative anchors are the settings schema [~71,080](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L71080), resolver [~253,996](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L253996), setup agent [~282,577](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L282577), slash command [~561,778](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L561778), shared spawner/executor [~575,565–577,990](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L575565), payload/refresh/render path [~831,800–832,180](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L831800), and subagent-row path [~846,830–847,040](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L846830).

#### Round 2 — convergence

The complete reread produced zero new source-answerable status-line mechanism questions. Full terminal-parser behavior, operating-system shell semantics, future payload compatibility, and runtime performance under arbitrary third-party commands remain explicit evidence limits. **Status: new focused page, cross-linked, and converged.**

## Evidence-limited questions retained

The following are not answered because the inspected local artifacts do not establish them safely:

1. **Provider/server internals:** hosted Artifact storage, marketplace hosting behavior, Claude Design collaboration/conflict handling, hosted connector catalogs, and provider-side WebSearch execution.
2. **External/native implementations:** the bundle exposes the JavaScript orchestration from `@anthropic-ai/sandbox-runtime`, but native helpers such as `srt-win.exe`, macOS computer-use native code, and OS/kernel enforcement guarantees remain outside the readable path.
3. **Exceptional termination completeness:** the normal model-loop and observed end-turn `PostToolBatch` branches are known; no claim is made that every abort/crash path dispatches equivalent hooks.
4. **Filesystem portability:** exclusive-create and mode flags are source-visible, but filesystem/OS semantics vary; `O_NOFOLLOW` is explicitly conditional.
5. **Marketplace transactions and remote consistency:** add's materialize-then-declare writes are visible, but no general crash transaction, repository consistency guarantee, or remote rollback is inferred.
6. **Future NPM marketplace behavior:** the schema recognizes the source kind, but the current materializer throws. No future design is inferred from that schema.
7. **Server-side policy/rollout:** bundle presence does not prove availability to every account, organization, provider, platform, or feature-gate cohort.
8. **Arbitrary status-line command behavior:** shell scripts, external programs, inherited host environment, and terminal parsing can vary by host. The client call path is known; third-party command correctness and every terminal-control behavior are not.

## Final convergence result

The original complete post-edit pass over all ten in-scope pages produced **zero new source-answerable mechanism questions**. Later focused rereads found the gated Windows sandbox path, reconstructed the status-line runtime, and separated plugin/configuration state; each owning page then produced zero new source-answerable questions.

| Page | Documentation decision | Final pass: new source-answerable questions | Status |
|---|---|---:|---|
| `architecture.md` | Edited | 0 | Converged |
| `artifact-publishing-and-live-pages.md` | Edited in command follow-up | 0 | Converged |
| `built-in-tools-and-permissions.md` | Edited | 0 | Converged |
| `claude-design-and-design-sync.md` | Unchanged | 0 | Converged |
| `computer-use-mcp.md` | Edited | 0 | Converged |
| `mcp-plugins-hooks.md` | Edited; hot-reload precision corrected in plugin follow-up | 0 | Converged |
| `plugin-lifecycle-and-configuration.md` | New focused follow-up | 0 | Converged |
| `browser-automation-and-claude-in-chrome.md` | New full-system follow-up | 0 | Converged |
| `ide-integration-and-lsp-diagnostics.md` | New full-system follow-up | 0 | Converged |
| `sandbox-and-isolation.md` | Edited in Windows follow-up | 0 | Converged |
| `settings-policy-and-integrations.md` | Edited; load/merge/reload/write pipeline added in plugin follow-up | 0 | Converged |
| `settings-schema-reference.md` | Edited in plugin/configuration follow-up | 0 | Converged |
| `skills-system.md` | Edited | 0 | Converged |
| `tool-runtime-events-and-integrations.md` | Edited | 0 | Converged |
| `status-line.md` | New focused follow-up | 0 | Converged |

Cross-page terminology now consistently preserves these boundaries:

- contiguous, bounded safe-call concurrency rather than universal parallelism;
- separate initial, pre-hook, and final permission-input validation;
- auto-mode-classifier-specific `PermissionDenied` dispatch and model guidance rather than automatic retry;
- per-call post hooks versus normal/end-turn aggregate-hook semantics;
- marketplace declaration state versus materialized state and final ownership cleanup;
- plugin installation/enablement versus manifest defaults versus `userConfig` and secure option storage;
- ordinary settings source merge versus admin-tier selection and security-specific accumulation;
- accepted settings-cache invalidation versus owner-specific plugin/resource reload;
- atomic settings replacement versus the narrow non-atomic filesystem fallback;
- npm plugin packages versus unsupported NPM marketplace acquisition;
- lazy, contained, exclusive bundled-file extraction with conditional no-follow support;
- all-step teaching-envelope normalization and pre-batch coordinate framing;
- Linux/macOS shell-string wrapping versus feature-gated Windows `srt-win` argv wrapping, session-wide ACLs, and WFP proxy fencing.
- `/statusline` setup versus the main JSON/stdout refresh loop, plus the separate `subagentStatusLine` JSONL task-row protocol.

## Validation

- Editor diagnostics reported no errors in all ten audited pages or this ledger.
- A targeted relative-link check resolved 178 Markdown targets across the eleven audit files.
- `git diff --check` passed.
- The Astro/Starlight production build loaded 86 source docs and generated 87 static pages, including `/99-research-atlas/mechanism-question-audit-tools-security/`. The only warning was the existing Vite large-chunk advisory.
- Allowed-file accounting identified exactly seven modified in-scope mechanism pages plus this new ledger. Pre-existing/concurrent working-tree changes in other documentation sections and their three ledgers were enumerated and excluded rather than modified.
- No navigation, README, summary, website configuration, generated artifact, extracted bundle, or source-atlas file was changed by this audit.

### Windows sandbox follow-up — 2026-07-24

- Full-analysis source reads confirmed the feature-gated Windows path from `Qnt()` through `/sandbox install`, `installWindowsSandbox()`, WFP/user/ACL initialization, `wrapWithSandboxArgv()`, shell spawn, live-config warning, and reset cleanup.
- Editor diagnostics reported no errors in the updated sandbox page, section index, or this ledger.
- All 61 relative Markdown targets across those three files resolved on disk, and the stale unsupported-Windows assertions were absent after the edit.
- Repository-wide `git diff --check` passed.
- Astro loaded 88 documentation sources and generated 89 static pages, including `/03-tools-integrations-security/sandbox-and-isolation/`; Pagefind and sitemap generation completed. The only warning was Vite's existing advisory for chunks larger than 500 kB after minification.
- Follow-up file accounting contains exactly three documentation changes: the sandbox page, its section-index description, and this ledger. No path under `claude-code-pkg/` or `source-atlas/` changed.
- `source-atlas/` was intentionally left untouched: there was no package-version delta, and focused enclosing control flow in the readable retained bundle supplied direct behavioral evidence.

**Audit status: complete and converged for Claude Code `2.1.215` on the inspected retained artifacts.**

### Complete built-in command follow-up — 2026-07-24

The cross-domain registry audit added three source-focused command rounds in this domain.

| Owner page | Newly answered mechanisms |
|---|---|
| `settings-policy-and-integrations.md` | `/config` descriptor whitelisting and consent boundaries; `/auto-mode-setup` recon → schema proposal → reviewed `--apply-file`; `/import` Codex/Gemini adapters, same-process confirmation latch, held-back project/warning/skill items, path/symlink/shell-marker guards; `/init`, `/keybindings`, and `/statusline` setup boundaries; `/remote-env` local-override cleanup plus user default write; `/web-setup` confirmed GitHub-token import and default-environment bootstrap. |
| `mcp-plugins-hooks.md` | `/reload-plugins` MCP cache-impact warning, complete plugin/agent/hook/MCP/LSP rebuild, guarded dependency repair, and remote control request; `/reload-skills` name-set re-enumeration; `/skill-doctor` usage/disuse heuristics and passive-plugin exclusions. |
| `artifact-publishing-and-live-pages.md` | `/artifacts`, live `artifact-capabilities`, design guidance, four expanded templates, executable `/dataviz` validators, plan/PR publishing, and disabled `/pr-explainer`/`code-walkthrough` registrations. |

Representative source ranges are `421026-421174`, `497000-497618`, `502418-505525`, `559800-560085`, `563760-563930`, `813295-813790`, `828230-828760`, and `873270-888410`. The complete command catalog links each name back to these owning mechanisms and classifies feature/account/policy/platform gates rather than treating source presence as universal availability.

The post-edit reread produced zero additional tools/security command mechanism questions answerable from the retained client. Server-side catalogs, policy rollout, and external/native implementation remain evidence limits. **Follow-up status: edited and converged.**

### Status-line runtime follow-up — 2026-07-24

- Full-analysis source reads traced the settings schema and resolver, `/statusline` setup agent, shared command spawner, main executor, JSON builder, refresh controller, renderer, footer placement, and separate subagent-row command path.
- An independent read-only source-versus-document review found no material factual error, overclaim, protocol-shape mistake, or missing source-answerable edge case.
- Editor diagnostics reported no errors in the new page or any changed cross-link/navigation file.
- A changed-document link check resolved all 1,304 relative Markdown targets across 44 Markdown files.
- Repository-wide `git diff --check` passed.
- Astro loaded 90 documentation sources and generated 91 static pages, including `/03-tools-integrations-security/status-line/`; Pagefind indexed 91 HTML files and sitemap generation completed. The only warning was the existing Vite advisory for chunks larger than 500 kB after minification.
- The focused follow-up changed documentation and `website/astro.config.mjs` only. No path under `claude-code-pkg/` or `source-atlas/` changed; `source-atlas/` was intentionally left untouched because the retained readable bundle supplied the required enclosing control flow.

**Status-line follow-up status: complete and converged for Claude Code `2.1.215`.**

### Plugin lifecycle and settings pipeline follow-up

This focused round separated five layers that the prior marketplace page necessarily compressed together: marketplace declaration/materialization, installation records, scoped enablement, manifest/plugin-owned defaults, and plugin `userConfig`. It also traced the general settings loader through source admission, validation, merge, change detection, and persistence.

#### `plugin-lifecycle-and-configuration.md`

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is a plugin represented by one settings record? | No. `extraKnownMarketplaces`, `known_marketplaces.json`, the versioned cache/`installed_plugins.json`, `enabledPlugins`, manifest/default settings, `pluginConfigs`, and secure option storage have different owners. | Created a focused layer diagram and lifecycle table. |
| How are colliding plugin sources selected? | Managed names block same-name session plugins; session-only entries override installed entries; installed/session entries shadow skills-directory entries; user skills-directory entries shadow project copies; trust gates project discovery. | Added source precedence separately from settings precedence. |
| How do install/enable/dependency state compose? | User/project/local installs can coexist by `projectPath`; ordinary `enabledPlugins` precedence applies; defaults yield to explicit values; dependency closure, reverse dependents, range pinners, auto-installed metadata, and prune/update guards constrain transitions. | Added scoped installation, enablement, dependency/version, rollback, and prune behavior. |
| Can a plugin inject arbitrary Claude Code settings? | No. `Dgy()` accepts only `agent` and `subagentStatusLine` as plugin-owned defaults in this build, and the aggregate sits below ordinary settings. | Added the exact allowlist and precedence. |
| Where do plugin options come from and where are secrets stored? | `MGr()` reads user → flag/SDK → policy only. `/plugin configure` and install-time `--config` write non-sensitive values to user `pluginConfigs` and sensitive values to `pluginSecrets`; secure values merge last. | Added schema, source restriction, storage split, migration scrubbing, and write-scope details. |
| Can `${user_config.*}` be substituted everywhere? | No. Exec-form component fields can expand it; shell-form hook/monitor commands reject direct substitution; skills/agents redact sensitive values; hooks also receive normalized `CLAUDE_PLUGIN_OPTION_*` variables. | Added component-specific substitution/security boundaries. |
| Does every settings edit fully hot-reload plugins? | No. The automatic hook subscriber reacts only to `policySettings` events and rebuilds hooks after a changed snapshot. `/reload-plugins` owns the full commands/agents/hooks/MCP/LSP contribution rebuild; updates can require restart. | Added the exact activation matrix and corrected the existing MCP page's overbroad hot-reload wording. |

#### Settings and MCP owner follow-up

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What is the ordinary settings order? | Enabled-plugin defaults → user → project → local → flag/SDK → policy. `--setting-sources` controls only user/project/local admission; flag and policy remain. | Added the ordered loader and corrected the schema reference's prior ambiguity. |
| How are arrays and policy model lists merged? | Arrays normally concatenate/de-duplicate; `fallbackModel` is replaced. Policy `availableModels` and `enforceAvailableModels` are copied back exactly after the merge. | Added merge exceptions and no-widening semantics. |
| Does one malformed key invalidate every source? | Ordinary files receive targeted permission/hook/MCP-list sanitization, then any remaining schema failure drops that file. Managed `mSi()` recovers per key and fails closed only for selected fields. | Added ordinary-versus-managed validation and the field-specific recovery table. |
| Are all managed sources deep-merged? | No. A helper can win; otherwise the first remote → MDM/HKLM/plist → managed-file admin object is selected. SDK parent policy contributes only a filtered slice, and `first-wins` omits that slice. Security consumers can still inspect all tiers. | Added tier selection versus selective accumulation. |
| How do external changes become live? | The watcher coalesces atomic saves/deletions, tracks symlink targets, suppresses self-write echoes, runs `ConfigChange`, clears caches only when admitted, and emits a source-specific event; MDM is additionally polled. | Added the change-admission sequence and owner-specific reload caveat. |
| Are settings writes direct overwrites? | Normally no. Same-file transforms serialize, preserve syntactically valid but schema-invalid raw objects, write an exclusive temp, preserve mode, sync, and rename. A narrow filesystem-error class can fall back to a non-atomic in-place write; project/local symlink redirection is rejected. | Added transform, symlink, atomic-write, fallback, and legacy-local revocation behavior. |

An independent read-only review confirmed the source restrictions, defaults allowlist, merge exception, admin-tier behavior, validation split, writer, compaction handoff, and policy-only plugin-hook reload. Its source-supported precision suggestions were applied for `projectPath`, `defaultEnabled`, user-only option writes, policy snapshot wording, and exact merge language; contradictory or already-satisfied suggestions were not adopted. A post-fix question pass produced zero new source-answerable plugin/configuration questions. **Focused follow-up status: new page plus owner corrections, converged.**

#### Plugin/configuration follow-up validation

- Editor diagnostics reported no errors in all 13 touched documentation/configuration files.
- A changed-document link scan resolved all 562 relative Markdown targets across 12 changed Markdown files. An initial checker rule treated an existing directory link as requiring `README.md`; rerunning with valid directory targets accepted produced zero failures.
- Generated HTML contains the newly referenced `userconfig-plugin-specific-options`, `load-validate-and-merge-pipeline`, and `plugin-marketplace-lifecycle` fragment IDs.
- Repository-wide `git diff --check` passed before the final validation-note update.
- The Astro/Starlight production build loaded 92 documentation sources and generated 93 pages, including `/03-tools-integrations-security/plugin-lifecycle-and-configuration/`. Pagefind indexed 93 HTML files and sitemap generation completed; the only warning was Vite's existing large-chunk advisory.
- Change accounting contained 12 Markdown files plus `website/astro.config.mjs`; no retained package artifact or `source-atlas/` file changed.

**Plugin/configuration follow-up status: complete, validated, and converged for Claude Code `2.1.215`.**

### Full-system follow-up: Chrome automation and IDE/LSP — 2026-07-25

The repository-wide audit compared the tool inventory and integration references with lifecycle owners. Two source-confirmed integration families had only list/summary coverage.

#### Browser automation and Claude in Chrome

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What starts browser automation? | Explicit/saved/auto-offer gates create a dynamic stdio MCP config that relaunches `--claude-in-chrome-mcp`; setup also installs the `--chrome-native-host` wrapper/manifest. | Created the setup/process-role lifecycle. |
| Which transport does the normal MCP context use? | `createChromeSocketClient()` chooses authenticated `BridgeClient` when `bridgeConfig` exists; the normal context supplies it. The native host/local socket pool is a separate packaged transport role. | Separated hosted WebSocket and native-messaging/socket paths. |
| How are browsers/tabs isolated? | The bridge discovers/selects an extension device; renderer MCP metadata carries session scope and caches `tabGroupId`; standalone navigation can front-load `tabs_context_mcp({createIfEmpty:true})`. | Added selection and session tab-group behavior. |
| Do “safe/read-only” sets bypass permissions? | No. They classify auto/plan subsets. Browser calls remain MCP tools at the common execution boundary, while bridge/extension site permissions add another check. | Corrected the permission interpretation. |
| What are the recovery bounds? | Source establishes 30 s handshake, 10 s connection wait, 60 s default tool call, 8 s hidden tab bootstrap, 30/90 s ping/pong, and bounded exponential reconnect. | Added timing, failure, and cleanup tables. |

#### IDE integration and LSP diagnostics

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Are IDE integration and LSP one connection? | No. IDE lock files create a dynamic `ws-ide`/`sse-ide` MCP client; enabled plugins independently supply lazy local LSP subprocesses. | Created one page with two explicitly separate call paths. |
| How does IDE discovery avoid arbitrary endpoints? | It reads bounded lock records, verifies PID/port/workspace/ancestor conditions, handles WSL mapping, and presents ambiguity through `/ide`. | Added discovery, auto-connect, 35 s connection, and disconnect behavior. |
| Where can LSP configs come from? | In this path, enabled plugin root `.lsp.json` plus contained/inline manifest `lspServers`; manifest entries merge after the root file and are namespaced. | Corrected the audit's generic-settings overclaim. |
| How do files and crashes behave? | Servers start lazily by extension; full content travels through didOpen/didChange/didSave, didClose occurs on the 50-document eviction path, and a crashed server can restart on next use within config bounds. | Added lifecycle and lazy-recovery semantics. |
| What reaches context? | `publishDiagnostics` is version-filtered, deduped, severity-sorted, and capped at 10/file and 30 total; delivered identities retain an LRU of 500 URIs. | Corrected inferred larger caps and documented delivery. |

Direct source validation rejected several report overclaims: normal Chrome calls do not traverse both transports, classifier subsets are not universal grants, LSP caps are 10/30 rather than 50/unknown, LSP config is plugin-owned here, and crash restart is next-use rather than immediate. The post-correction reread produced zero new source-answerable browser/IDE/LSP questions. **Focused follow-up status: two new pages, owner handoffs, and converged.**
