# Mechanism-question audit: context and model loop

This ledger records a full-analysis reverse-engineering audit of eight mechanism-oriented pages under `docs/02-context-model-loop`. It records the questions derived from the pre-audit pages, source-confirmed answers, documentation decisions, convergence passes, and the limits beyond which the retained artifacts do not support a claim.

## Scope and exclusions

Audited pages:

1. [`architecture.md`](../02-context-model-loop/architecture.md)
2. [`context-memory-compaction-checkpoints.md`](../02-context-model-loop/context-memory-compaction-checkpoints.md)
3. [`headless-streaming-and-resilience.md`](../02-context-model-loop/headless-streaming-and-resilience.md)
4. [`model-selection-usage-quota-billing.md`](../02-context-model-loop/model-selection-usage-quota-billing.md)
5. [`models-providers-auth.md`](../02-context-model-loop/models-providers-auth.md)
6. [`prompt-assembly-scenarios.md`](../02-context-model-loop/prompt-assembly-scenarios.md)
7. [`prompt-context-memory.md`](../02-context-model-loop/prompt-context-memory.md)
8. [`team-memory.md`](../02-context-model-loop/team-memory.md)

The eight target pages were clean when the audit began, so Git `HEAD` is the pre-audit baseline used to derive the question rounds below. Existing valid explanations were retained; a page was edited only when enclosing retained control flow answered a material missing question or contradicted current prose.

Excluded from direct editing were section README and shared index/navigation files, `docs/README.md`, `docs/SUMMARY.md`, the repository README, website configuration, other documentation sections, other research ledgers, extracted source artifacts, generated prompt files/catalog data, and `source-atlas/`. Concurrent changes under `docs/06-agents-automation` were outside this audit and were neither edited nor reverted.

## Artifact identity and evidence model

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code@2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Primary behavioral view | [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) — 984,455 lines; SHA-256 `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` |
| Normalized corroborating view | [`cli.formatted.js`](../../claude-code-pkg/src/entrypoints/cli.formatted.js) — SHA-256 `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` |
| Raw retained entrypoint | [`cli.js`](../../claude-code-pkg/src/entrypoints/cli.js) — SHA-256 `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` |
| Audit host | Linux |

The three JavaScript files are different views of one retained artifact, not independent implementations. The evidence rules were:

- Enclosing readable control flow in `cli.renamed.js` was primary proof for behavioral claims.
- Exact strings and symbols plus approximate bundle lines are build-specific anchors; semantic names describe their roles.
- The normalized and raw views corroborated artifact identity or transformed text when useful.
- Prompt catalogs, module maps, schemas, help strings, and isolated string hits were discovery or supporting evidence, not standalone proof of a runtime lifecycle.
- Existing documentation supplied questions and context, not evidence.
- Provider/server decisions outside the retained client were left as explicit unknowns.

`source-atlas/` was intentionally left untouched. The readable retained bundle supplied the required call paths, and this audit did not request a package-version atlas regeneration.

## Question and convergence method

For each page:

1. Read the `HEAD` version and relevant neighboring pages.
2. Ask zero to ten genuine mechanism questions about identity, ordering, routing, state, failure, persistence, cleanup, limits, and edge cases.
3. Trace each question through focused `cli.renamed.js` ranges and enclosing functions.
4. Patch only source-confirmed omissions or overclaims, preserving valid prose and evidence limits.
5. Re-read every audited page after the edits and ask only new questions introduced or still unanswered.
6. Repeat until one complete pass over all eight pages yields zero new retained-artifact-answerable questions.

In this ledger, **“zero new questions” means zero new questions answerable from retained artifacts, not omniscience.** Questions requiring unavailable server code, a live provider/account, native or platform internals, runtime request capture, or another build remain evidence limits rather than guessed answers.

## Cross-cutting source findings

| Mechanism question | Source-confirmed answer | Representative anchors |
|---|---|---|
| Is prompt precedence the same operation as request partitioning? | No. `vne()` resolves the base system-prompt branch, while `fetchSystemPromptParts()` returns default prompt, `userContext`, and `systemContext`; messages and structured tools remain separate planes. | `vne()` [~333,575](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L333575); `fetchSystemPromptParts()` [~563,486](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L563486) |
| Does dynamic-section exclusion delete machine/session context? | No. `M2()` omits selected dynamic fragments and `rxo()`/`fetchSystemPromptParts()` relocate relevant material into `userContext`, with `systemContext` empty on that path. | `M2()`, `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, `rxo()` [~563,486–569,300](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L563486) |
| Is authentication one global secret-precedence list? | No. Ordered provider selection occurs first; bearer/OAuth, API key, WIF, host/cloud credentials, headers, and refresh are context-sensitive lanes. | `getAPIProvider()` [~119,000](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L119000); auth resolvers [~184,900–188,899](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L184900) |
| Does `claude setup-token` mint and store a Console API key? | No. It requests an inference-only, one-year OAuth access token, displays it for `CLAUDE_CODE_OAUTH_TOKEN`, and bypasses `H$t()` and `createAndStoreApiKey()`. | OAuth client [~183,700–185,699](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L183700); setup-token [~650,900–651,300](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L650900) |
| Are third-party startup fallback, stale-pin upgrade, and overload fallback one mechanism? | No. Startup probes can assign usable family defaults; interactive Bedrock/Vertex flows offer persistent same-tier pin upgrades; `--fallback-model` advances an overload chain for print/headless turns. | probes/fallback [~506,381–507,599](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L506381); upgrade dialog [~936,598–936,782](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L936598) |
| Is a headless `result` universally the final outbound frame? | No. Holdback is conditional on closed input plus qualifying task/notification work. Immediate or flushed results can be followed by prompt suggestions or side-channel frames; outbound closure is the no-more-frames boundary. | `S8f()`, `j7a()`, `G7a()` [~948,659–948,750](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L948659); loop closure [~952,700–956,145](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L952700) |
| Is headless cleanup one drain? | No. Print/control-loop finalization, `runHeadless()` post-loop drains, SDK `performCleanup()`, and subprocess termination have separate owners and guarantees. | `performCleanup()` [~608,462](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L608462); headless loop [~952,700–956,145](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L952700) |
| Does current subagent assembly use the old prompt-catalog aliases? | No. `UV()` constructs the run; `uqg()` obtains and augments the agent prompt through `y8r()`; `pqg()` can add scratchpad guidance; a separate feature gate controls final append text. | subagent assembly [~352,713–353,500](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L352713) |
| Does `promptIndexMaxBytes` cap team-memory service reads? | No. `TXh()` calls `readByPath(promptIndex)` without that value. `N4r()` normalizes prompt exposure, while `promptIndexMaxBytes` drives post-write size/proximity feedback. | store/prompt path [~190,175–194,000](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L190175); feedback path [~435,512–436,562](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L435512) |

## Per-page question rounds

### `architecture.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does one system-prompt array represent every model-visible input? | No. Base system text, user/system context, messages/attachments, and structured tools remain distinct request inputs. | Retained and sharpened the layered request architecture. |
| Does dynamic exclusion remove context? | No. Selected dynamic/system material is relocated into `userContext`. | Retained relocation rather than deletion as a design rule. |
| How do provider selection and authentication compose? | Provider selection is ordered; authentication then follows provider/host-specific credential lanes, with a separate eligible Bedrock-to-Mantle secondary route. | Retained the ordered router plus credential matrix. |
| Is every headless result held until all producers finish? | No. Holdback applies only after input closes while `S8f()` or `mei()` reports qualifying work; other results enqueue immediately. | Replaced the universal result-drain model with conditional holdback. |
| What proves no more outbound frames will arrive? | Final outbound closure (`W.done()`), not a logical `result` frame. | Added the closure boundary to the architecture diagram, design decisions, failures, and extension points. |
| Are compaction and fallback each single mechanisms? | No. Compaction has full, partial, reactive, and precomputed paths; fallback has startup-provider, overload, and helper meanings. | Preserved the family distinctions and cross-links. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

### `context-memory-compaction-checkpoints.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is memory-file selection a transcript-compression pass? | No. `Izy()` is a separate default-Sonnet structured selector with the normal system prefix skipped. | Existing page already answered this; unchanged. |
| Which compaction shapes exist? | Full, partial, reactive, and precomputed paths differ in trigger, preserved suffix, retry, hook timing, and persistence. | Existing variant table and call paths were retained. |
| When do compaction hooks run for precompute? | `PreCompact` runs when the background precompute is armed; `PostCompact` runs only when a ready result is materialized. | Existing lifecycle explanation was complete. |
| How does reactive prompt-too-long recovery progress? | It preserves progressively more trailing groups, using a token gap when available; media has one placeholder retry. | Existing retry explanation was complete. |
| Which sidecar checks reject reuse? | Schema/size, session/model, age, boundary, context growth/shrinkage, and preserved UUID checks reject; CLI-version mismatch is telemetry only. | Existing version-1 sidecar rules were retained. |
| What context is rebuilt after compaction? | Transient state is cleared and a bounded current attachment set is reconstructed, including up to five recent files with per-file and aggregate limits. | Existing attachment restoration section was retained. |
| How are preserved messages restored on resume? | Explicit UUID metadata is preferred; the legacy contiguous segment is validated; broken chains are logged rather than guessed. | Existing reconstruction section was retained. |
| Are compaction, context collapse, and file rewind one checkpoint system? | No. They are distinct transcript, collapse-state, and filesystem loops; no general source-confirmed `undo` command was found. | Existing checkpoint/rewind separation was retained. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. The page was intentionally not churned. **Status: unchanged and converged.**

### `headless-streaming-and-resilience.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| What correlates control requests, responses, and cancellation? | `request_id` links the envelope families; `keep_alive` is not a response. | Existing protocol explanation was retained. |
| What exactly activates result holdback? | For an ordinary queried turn, input must be closed and a qualifying running task or notification wait must remain. | Added the exact predicate and `shouldQuery:false` bypass. |
| Can a result be followed by another frame? | Yes. A pending prompt suggestion follows a flushed held result, and suggestions or other side channels can follow an immediate result. | Recast `result` as a logical outcome rather than end-of-stream. |
| What is the reliable no-more-frames signal? | Outbound iterator/stream closure. | Added an explicit consumer rule and failure warning. |
| Which code buffers and flushes held results? | `j7a()` buffers; `G7a()` flushes after the command/background loop exits. | Added current implementation anchors and ordering. |
| Who owns cleanup after the result? | The print/control loop, runner post-loop drains, SDK query cleanup, and subprocess transport each own a separate layer. | Replaced a single cleanup story with a four-layer table. |
| Is stream JSON just a terminal-result serialization? | No. It is a multiplexed frame stream. | Corrected the flow diagram and format table. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

### `model-selection-usage-quota-billing.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is there one fixed count of concrete models? | No. The runtime has logical roles whose concrete IDs vary by provider, policy, account, settings, and feature state. | Retained the role-based model explanation. |
| What is startup model precedence? | CLI, non-inherit agent frontmatter, `ANTHROPIC_MODEL`, settings, then the default resolver; per-turn logic can still alter the effective model. | Existing precedence explanation was retained. |
| Are third-party default fallback and overload fallback the same? | No. Startup provider probes choose callable defaults; `--fallback-model` handles repeated overload and retries the primary next turn. | Added an explicit mechanism/lifetime comparison. |
| Do current Bedrock and Vertex stale-pin upgrade flows exist? | Yes. Both find recognized older same-tier pins, probe newer provider IDs, and invoke a shared upgrade dialog outside excluded host modes. | Replaced the unsupported denial with current call paths. |
| What does HTTP 429 mean during accessibility probing? | It counts as accessible because the provider recognized the model route. | Added the probe interpretation. |
| How are accepted or declined pin upgrades handled? | Accepted IDs persist to `userSettings.env`; process env and relaunch follow only successful writes. Declined from/to pairs suppress repeat offers. | Added save, decline, Haiku dual-env, and relaunch behavior. |
| Does Bedrock use `ListFoundationModels` for this flow? | No. Separate discovery uses `ListInferenceProfiles`; the upgrade probes use the common Messages client. | Added the discovery distinction. |
| Is Mantle availability simply true/false? | No. It has accessible, unavailable for selected non-credential statuses, and unknown outcomes. | Added the tri-state boundary. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

### `models-providers-auth.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Is provider selection ordered? | Yes. Gateway wins, followed by Bedrock, Foundry, Anthropic AWS, Anthropic Google Cloud, Mantle, Vertex, then first party. | Existing ordered provider table was retained. |
| Are bearer/OAuth and API keys one source chain? | No. `getAuthTokenSource()` and `getAnthropicApiKeyWithSource()` are separate provenance lanes selected in context. | Existing branch-matrix explanation was retained. |
| Where does WIF fit? | `shouldUseWIFAuth()` is an eligibility gate after provider, host, explicit-source, helper, and stored-OAuth exclusions. | Existing WIF boundary was retained. |
| Does `loginWithClaudeAi` choose the OAuth scope set? | No. It selects the authorize URL. Custom-client scopes, inference-only scope, or `ALL_OAUTH_SCOPES` are selected independently. | Added the exact `buildAuthUrl()` branch and removed the nonexistent `CONSOLE_OAUTH_SCOPES` concept. |
| Do token exchange and refresh attach `OAUTH_BETA_HEADER` locally? | No. Both inspected POSTs declare JSON content type; the beta header belongs to other authenticated paths. | Added request-header boundaries. |
| What does setup-token return? | A one-year inference-only OAuth `accessToken` for `CLAUDE_CODE_OAUTH_TOKEN`, not a newly minted API key. | Corrected the setup-token lifecycle. |
| What does ordinary login completion do? | `H$t()` persists OAuth state, records account/profile data, fetches roles, keeps inference-scoped auth on OAuth, and creates an API key only for non-inference completion. | Added the OAuth-versus-API-key completion branch. |
| Is MCP XAA part of Anthropic provider auth? | No. It is a separately gated MCP OAuth extension with its own token-exchange/cache behavior. | Existing separation was retained. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

### `prompt-assembly-scenarios.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Does total `--system-prompt` replacement necessarily preserve ordinary append text? | No. The override branch returns before the ordinary late append unless the caller already merged it. | Existing branch matrix was retained. |
| Does dynamic exclusion drop the excluded material? | No. It redirects relevant default/system context into `userContext`. | Existing scenario was retained and aligned with the architecture page. |
| What is the current subagent construction path? | `UV()` builds the run; `uqg()` obtains the prompt; `y8r()` adds operating/environment notes; `pqg()` can append scratchpad guidance. | Replaced stale `Cq5`/`jX$` behavioral anchors. |
| Is the subagent environment guaranteed to be one dedicated `SYSTEM[1]` block? | No. Fragments share an array and are normalized/cache-decorated later. | Removed the unsupported fixed-block implication. |
| How is custom subagent append text applied? | Only when `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT` is enabled and append text is present; it joins the same prompt array. | Added the feature-gated append path. |
| Do worktree and fork state prove dedicated system-text blocks? | No. They also affect permission, directory, metadata, message, and tool/context planes. | Narrowed the scenario to observed request planes. |
| What are the current WebSearch and WebFetch helper shapes? | WebSearch uses a short system prompt and tool schema; WebFetch apply primarily constructs a user message with an empty system array. | Updated current call-path anchors. |
| Which compact helper calls are current? | Preferred and reactive paths use forked agent calls with `querySource:"compact"`; the direct fallback uses the short summarizer system prompt. | Updated compact call paths and qualified old catalog coordinates. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

### `prompt-context-memory.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Which request planes carry context? | Resolved base system prompt, `userContext`, `systemContext`, messages/reminders/attachments, and structured tools are separate inputs. | Existing layered model was complete; unchanged. |
| How do override and append interact? | `vne()` gives total override priority; ordinary append occurs only in branches that reach it. | Existing precedence explanation was retained. |
| What does dynamic exclusion do? | It omits selected default fragments, relocates relevant material into `userContext`, and empties `systemContext` on that path. | Existing relocation explanation was retained. |
| What changes when a custom prompt is supplied? | Default prompt generation and ordinary `systemContext` loading are skipped, while ordinary `userContext` remains. | Existing custom-prompt boundary was retained. |
| How is relevant memory selected? | `Izy()` uses default Sonnet, skips the normal prefix, returns `selected_memories`, and filters names against candidates. | Existing helper-call explanation was retained. |
| Can source alone produce every fully expanded prompt? | No. Static literals can be cataloged; exact provider-facing bodies require concrete runtime state or capture. | Existing trace boundary was retained. |
| How do local, command, and remote file suggestions differ? | Local/command lanes cap at 15; remote maps host results without another client cap. | Existing lane distinction was retained. |
| How does the file index avoid stale publication? | Five-second freshness, Git-index invalidation, a later untracked scan, cache generations, and build generations guard updates. | Existing cache and stale-result explanation was retained. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. The page was intentionally not churned. **Status: unchanged and converged.**

### `team-memory.md`

#### Round 1

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| Are explicit stores and organization discovery additive? | No. A valid explicit `CLAUDE_MEMORY_STORES` configuration suppresses organization discovery; both lanes converge on descriptor/mirror machinery. | Existing control-plane distinction was retained. |
| Is a backend store path directly exposed to tools? | No. Each mount has a local mirror under the team-memory root with separate synchronization metadata. | Existing mirror architecture was retained. |
| Do team-memory key validators mediate every generic file tool? | Not proven. `yji()`/`o4c()` protect specialized backend/mirror paths; generic tools retain their own permission and sandbox boundaries. | Existing safety caveat was retained. |
| How long can prompt-index fetches wait? | `PUc()` supplies a five-second default timeout. | Added the timeout to the prompt path. |
| Does `promptIndexMaxBytes` limit `readByPath(promptIndex)`? | No. `TXh()` does not pass it to the service read. | Corrected the direct-fetch-limit claim. |
| What limits and sanitizes prompt exposure? | `N4r()` applies shared 200-line and 25,000-unit limits; closing `</memory` text is escaped and content is wrapped as untrusted reference data. | Added the actual normalization/trust boundary. |
| Where is `promptIndexMaxBytes` used? | `LYu()`/`PYu()` use it for post-write/edit proximity and over-limit feedback. | Reclassified the field as feedback configuration. |
| What server guarantees can the client establish? | It cannot establish backend durability, replication, complete conflict resolution, or grant-policy internals. | Existing evidence limits were retained. |

#### Round 2 — convergence

Zero new retained-artifact-answerable mechanism questions. **Status: edited and converged.**

## Final convergence result

The first complete post-edit reread found no new subsystem gap, but it did expose narrow terminology/precision issues: duplicated OAuth predicate prose, residual “final result” wording, stream-JSON/result framing ambiguity, and an overbroad compact-helper sentence. Those were corrected and all eight pages were reread again.

The subsequent complete pass produced **zero new questions answerable from retained artifacts**.

| Page | Documentation decision | Final pass: new retained-artifact-answerable questions | Status |
|---|---|---:|---|
| `architecture.md` | Edited | 0 | Converged |
| `context-memory-compaction-checkpoints.md` | Unchanged | 0 | Converged |
| `headless-streaming-and-resilience.md` | Edited | 0 | Converged |
| `model-selection-usage-quota-billing.md` | Edited | 0 | Converged |
| `models-providers-auth.md` | Edited | 0 | Converged |
| `prompt-assembly-scenarios.md` | Edited | 0 | Converged |
| `prompt-context-memory.md` | Unchanged | 0 | Converged |
| `team-memory.md` | Edited | 0 | Converged |

Cross-page terminology now consistently preserves these boundaries:

- prompt precedence versus request partition;
- dynamic-context relocation versus deletion;
- ordered provider selection versus credential-lane resolution;
- OAuth access-token state versus API-key state;
- setup-token versus normal login completion;
- startup third-party fallback versus stale-pin migration versus overload fallback;
- logical result production versus conditional holdback versus stream closure;
- print-loop draining versus SDK cleanup versus subprocess shutdown;
- current subagent call paths versus catalog-only aliases;
- team prompt-index fetch/normalization versus write-size feedback.

## Remaining evidence limits

1. **Provider and server internals:** account entitlement, deployment availability, quota computation, memory-service storage, grant persistence, and remote replay are not visible in the retained client.
2. **Concrete runtime request:** static source establishes assembly planes and call paths, but no sanitized provider-facing request for one concrete session is retained in the repository.
3. **Original source architecture:** semantic names are reconstructed from a generated bundle; no original TypeScript module tree or source map is claimed.
4. **Platform and host behavior:** cloud SDK credential chains, host-managed callbacks, filesystem semantics, and subprocess behavior can depend on platform and host implementations outside the inspected path.
5. **Feature and policy rollout:** source presence does not prove availability to every account, organization, provider, entrypoint, policy, or feature-gate cohort.
6. **Future/version behavior:** aliases, minified symbols, catalog IDs, thresholds, and sidecar acceptance rules are pinned to `2.1.215`; no compatibility claim is made for another build.
7. **Universal failure guarantees:** observed cleanup and retry branches establish their local owners, not exactly-once persistence or equivalent handling for every crash or remote transport failure.

## Validation

Validation after convergence produced these results:

- Editor diagnostics reported no errors in all eight audited pages or this ledger.
- A targeted relative-link check resolved 127 Markdown file targets across the nine-file audit scope.
- Scoped `git diff --check` passed.
- The Astro/Starlight production build loaded 88 documentation sources and generated 89 static pages, including `/99-research-atlas/mechanism-question-audit-context-model/`. The only warning was the existing Vite advisory for chunks larger than 500 kB after minification.
- Scoped Git accounting identified exactly six modified target pages plus this new ledger. `context-memory-compaction-checkpoints.md` and `prompt-context-memory.md` remained unchanged from `HEAD`.
- Concurrent changes under `docs/06-agents-automation` and their separate ledger remained outside this audit and were neither modified nor reverted.
- No shared index, README, website configuration, extracted source artifact, generated prompt file, or source-atlas file was changed by this audit.

**Audit status: complete, validated, and converged for Claude Code `2.1.215` on the inspected retained artifacts.**
