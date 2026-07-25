# Runtime mechanism question audit

## Purpose and scope

This ledger records a full-analysis reverse-engineering audit of mechanism-explaining pages under `docs/00-start-here` and `docs/01-runtime-lifecycle`. The audit was performed against the retained Claude Code `2.1.215` artifacts and produced documentation changes, not only a research report.

In-scope pages:

1. `docs/00-start-here/system-architecture.md`
2. `docs/00-start-here/runtime-communication-protocols.md`
3. `docs/00-start-here/main-feature-map.md`
4. `docs/01-runtime-lifecycle/package-and-bun-bootstrap.md`
5. `docs/01-runtime-lifecycle/cli-main-paths.md`
6. `docs/01-runtime-lifecycle/daemon-and-background-service.md`
7. `docs/01-runtime-lifecycle/accessibility-and-screen-reader-mode.md`
8. `docs/01-runtime-lifecycle/conversation-termination.md`
9. `docs/01-runtime-lifecycle/architecture.md`
10. `docs/01-runtime-lifecycle/commands-and-flags.md`

The later repository-wide coverage review added and audited an eleventh mechanism page, [`terminal-ui-renderer-and-input.md`](../01-runtime-lifecycle/terminal-ui-renderer-and-input.md). The subsequent information-architecture review retired the duplicative `commands-and-flags.md` page after assigning its routing material to [`cli-main-paths.md`](../01-runtime-lifecycle/cli-main-paths.md) and its inventory material to [`command-line-reference.md`](../01-runtime-lifecycle/command-line-reference.md). The current runtime/startup count is therefore ten; the historical ten-page scope/validation figures below remain unchanged.

`main-feature-map.md` and `commands-and-flags.md` were initially conditional. Both were classified as in scope because they explain mechanism and dispatch ordering rather than serving only as inventories.

The later consolidation supersedes that classification for the published structure: the command page's useful findings remain, but it no longer has independent ownership.

Excluded from direct editing:

- section README/index pages and glossary-only pages;
- pure command/reference inventories except where a mechanism page cross-links them;
- `docs/README.md`, `docs/SUMMARY.md`, the repository `README.md`, website configuration, other audit ledgers, generated prompt catalogs, and everything under `claude-code-pkg`;
- unrelated concurrent working-tree changes outside the eleven runtime-audit files, including changes under `docs/03-tools-integrations-security`, `docs/04-sessions-persistence-remote`, `docs/05-hosted-agent-ops`, and other audit ledgers.

## Artifact identity and trust model

| Artifact | Identity | Audit use |
|---|---|---|
| Package/build | `@anthropic-ai/claude-code@2.1.215`; build `2026-07-19T00:01:04Z`; Git SHA `316ce99628e89900bf0b1328fed3b8fec0c0c92d` | Pins all observations to one build. |
| `cli.renamed.js` | 984,455 lines; SHA-256 `461de0af948a1698a421a7a9072b6168bc5edc9a546e9e666db629cbcc0c72ce` | Primary behavioral source because enclosing control flow is readable. |
| `cli.js` | 39,610 lines; SHA-256 `78007444c51f6828a8c122c97d436038c72c035f9149178d0a8ba13e77cda350` | Corroborates the raw retained entrypoint and artifact identity. |
| `cli.formatted.js` | 966,414 lines; SHA-256 `27097d9fb63aa593aad6a4e2de01b39b0b6a71062db6dcf4650a6048412ece5f` | Secondary readable/minification corroboration. |
| Extraction scripts | `scripts/extract-claude-code-pkg.mjs`, `scripts/extract-claude-code-final-artifacts.mjs` | Prove repository extraction/pruning behavior, not every end-user wrapper runtime branch. |

Evidence rules used in this audit:

- A behavioral claim required enclosing control flow in `cli.renamed.js`, not an isolated string.
- Exact symbols/strings and approximate line anchors identify build-specific evidence; semantic aliases describe stable roles.
- Existing docs supplied questions and context, not proof.
- Extractor code proves how this repository obtains and prunes artifacts. It does not prove the exact runtime wrapper-to-native handoff after wrapper/native directories have been removed.
- Absence claims were made only after checking both documented option/handler names and the positive startup/routing implementation.

## Convergence rule

For each page:

1. Read the page and relevant neighboring pages.
2. Ask zero to ten concrete mechanism questions that the page leaves unanswered or answers inconsistently.
3. Inspect focused source ranges and enclosing control flow.
4. Edit only source-confirmed answers; retain explicit evidence limits.
5. Re-read the edited page and ask another round.
6. Stop only when one complete pass over every in-scope page yields zero new source-answerable mechanism questions.

“Zero new questions” does not mean that every imaginable implementation detail is known. It means no additional question that is material to the page's mechanism, answerable from retained sources, and missing or misleading in the page was found during the final pass.

## Cross-cutting source findings

### Startup and routing

- `ZIS()` (~983,909) is the outer process router.
- Version-only argv returns before normal-main import.
- Dedicated pre-main paths cover Chrome/computer-use hosts, daemon workers, PTY hosts, warm spares, preload, direct bridge aliases, daemon/background operations, an eligible agents-view shortcut, and an enabled tmux/worktree handoff.
- Normal startup lazily imports `var uri = {}; nt(uri, { main: () => UkS })`.
- `UkS()` (~978,259) installs early handling, handles `--handle-uri`, performs a narrow gated `import` rewrite, and awaits `jkS()`.
- `jkS()` (~978,305) obtains the program from `rYf(...)`, performs print fast parsing, registers heavier utility commands, and parses argv.
- The artifact has no root `--server`, `--headless`, or `--acp` option and no `startServerMode` or `startACPMode` handler.

### Shutdown

- Two global disposer registries (`_a`/`A5t` and `qnl`/`$Hn`, class `bsi`, ~3,500) snapshot and clear their sets before running callbacks in parallel with `Promise.all`.
- Process-level `gracefulShutdown` (~577,500) is single-claim through `Uut`.
- Primary cleanup receives a two-second race; timeout does not suppress later phases.
- Session-end hooks have their own abort timeout.
- Pending writes, analytics, debug output, secondary cleanup, and stdout are drained before exit; a failsafe covers a stalled sequence.
- SIGTERM-to-SIGKILL escalation is owner-specific. For example, daemon registry worker `hri.stop()` uses a five-second escalation; no universal all-child rule was found.

### Screen-reader mode

- `$Bc` (~187,645) resolves flag, env, settings, then a feature-gate veto and caches decision/source until `reset()`.
- `qt()` accepts trimmed, case-insensitive `1`, `true`, `yes`, and `on`.
- `gu()` accepts `0`, `false`, `no`, and `off`.
- `Pe.triBool()` returns `true`, `false`, or `undefined`; an unrecognized env value therefore does not count as explicit false.
- `NBc()` reports activation source and `vrt()` propagates `CLAUDE_AX_SCREEN_READER=1` to covered children.

### Conversation termination

- Tool availability requires model, feature, entrypoint, and runtime eligibility.
- The first eligible `EndConversation` call returns reflection guidance; a qualifying second call terminates.
- Backward history scanning distinguishes substantive user input from tool-result-only user frames.
- Fork/background-agent calls cannot terminate the parent conversation.
- `markSessionEndedByModel` runs before abort/state transition; failure is logged but does not block termination.
- Headless termination calls graceful shutdown with exit code 1.
- Direct resume (~924,000) and picker resume (~937,500) both call `applyEndedByModelOnResume(...)`.
- Marker collection is suppressed while `Y8n()` is active.

### MCP and inbox failure/trust semantics

- On MCP list-change failure, failed fields are passed as `undefined`; the reducer retains their previous values.
- Tools and prompts preserve prior values on failed discovery.
- Resources, resource templates, and commands refresh independently, allowing partial success.
- The inbox poller always drops `team_permission_update` because permission rules are never accepted from inbox transport.
- Other control-like inbox messages use sender/role validation; unrouted frames are dropped.

### Daemon control and lifecycle

- `controlRequest()` (~745,600) writes newline-delimited JSON and resolves the first response line; default timeout is 5,000 ms.
- The server (`V1p()`/`FX_()`, ~762,300) enforces a 1 MiB request cap, protocol/schema checks, peer UID checks where supported, and operation authentication.
- `BG_PROTO_MIN = BG_PROTO = 1`; mismatch returns `EPROTO` and restart guidance.
- Sensitive `dispatch`, `reply`, keyed `attach`, and `permission-response` operations validate the control key.
- `openDaemonLease()` keeps a connection alive and reconnects after closure; subscriptions stream newline-delimited events.
- `krm()` (~981,900) pins transient liveness with `leaseCount() + liveHandleCount()`. Configured registry workers do not pin the supervisor.
- A foreground/service daemon can request a transient daemon to yield. A transient daemon never displaces an existing one.
- Displaced close propagates `skipUnlink`; ownership is rechecked so the successor's control socket remains in place.
- Service templates exist, but service installation/commands are feature-gated and not universally available.

## Per-page question rounds

### `docs/00-start-here/system-architecture.md`

#### Round 1

1. **Which retained file is the primary source for behavioral claims?**  
   Answer: `cli.renamed.js`; raw `cli.js` corroborates identity. The opening trust statement was corrected.
2. **Are `J9A`, `O4A`, and `w4A` current startup anchors?**  
   Answer: no. Current symbols are `ZIS`, `UkS`, and `jkS`; the anchor table, diagrams, and question table were updated.
3. **Does every invocation reach the Commander composition root?**  
   Answer: no. `ZIS()` completes multiple specialized process paths first. The dependency/startup diagrams now show that branch.
4. **Is there a root server/ACP mode?**  
   Answer: no. The overview now explicitly rejects those unsupported branches and points long-lived local background behavior to the daemon.
5. **What shutdown guarantees are architectural versus subsystem-specific?**  
   Answer: global registry and process-phase behavior are architectural; child escalation is owner-specific. A shutdown/ownership section was added.
6. **Which serialized channels carry authority?**  
   Answer: not all. The protocol matrix now includes daemon auth, MCP last-good refresh, and inbox permission rejection.

#### Round 2

No new source-answerable mechanism question was found. Remaining detail belongs to linked focused pages.

### `docs/00-start-here/runtime-communication-protocols.md`

#### Round 1

1. **What is the daemon wire framing?**  
   Answer: newline-delimited JSON over a local socket; one-shot clients resolve the first response line.
2. **How are daemon version skew and malformed/oversized input handled?**  
   Answer: protocol 1 range checks return `EPROTO`; requests are capped at 1 MiB and schema-validated.
3. **Is local socket reachability sufficient authorization?**  
   Answer: no. Peer UID is checked where supported and sensitive operations validate a control key.
4. **What happens when MCP list-change discovery fails?**  
   Answer: last-good fields remain; resource-related fields can succeed/fail independently.
5. **Can team inbox messages update permission rules?**  
   Answer: no. `team_permission_update` is always dropped; other control-like frames undergo sender/role checks.
6. **How do daemon leases/subscriptions differ from one-shot control requests?**  
   Answer: they retain the connection; leases pin transient liveness and reconnect, subscriptions stream events.

#### Round 2

No new source-answerable mechanism question was found. Transport selection for every external configuration remains intentionally outside the page's evidence.

### `docs/00-start-here/main-feature-map.md`

#### Round 1

1. **Does the map communicate the actual startup spine?**  
   Answer: it now names `ZIS()` → `UkS()` → `jkS()` and distinguishes specialized pre-main roles.
2. **Does package startup overclaim the retained wrapper handoff?**  
   Answer: corrected; the graph/payload is confirmed, exact wrapper execution is not retained.
3. **Is the daemon represented as a mechanism rather than incidental ops text?**  
   Answer: yes; a feature-map row now links supervisor origin, control protocol, leases, and operations.
4. **Are critical failure/trust semantics visible at map level?**  
   Answer: yes; MCP last-good refresh, inbox rejection, daemon authentication, and EndConversation resume durability are summarized.

#### Round 2

No new source-answerable mechanism question was found. The page remains a map rather than duplicating implementation pages.

### `docs/01-runtime-lifecycle/package-and-bun-bootstrap.md`

#### Round 1

1. **Does the retained checkout prove the npm wrapper's exact runtime handoff?**  
   Answer: no. Wrapper/native trees and metadata were pruned; this limit is now explicit.
2. **What does extractor code prove?**  
   Answer: package download/platform selection for extraction, `.bun` extraction, graph parsing, retained roots, and pruning.
3. **What does the extracted runtime prove?**  
   Answer: the Bun graph entrypoint and `ZIS()` JavaScript behavior once executed.
4. **Which pre-main routes occur before `UkS()`?**  
   Answer: version, internal hosts/helpers, bridge, daemon/background, eligible fleet UI, tmux/worktree, then normal main.
5. **Where is the confirmed normal-main boundary?**  
   Answer: `uri.main` exporting `UkS()`; the sequence diagram and prose were updated.

#### Round 2

No new source-answerable mechanism question was found. Exact wrapper-to-native launch behavior remains unresolved because its artifacts were intentionally pruned.

### `docs/01-runtime-lifecycle/cli-main-paths.md`

#### Round 1

1. **What are the current startup symbols and ordering?**  
   Answer: `ZIS()` → lazy `uri.main`/`UkS()` → `jkS()`; all stale startup aliases were replaced in the source table and narrative.
2. **What exactly bypasses normal main?**  
   Answer: version, internal hosts/helpers, bridge aliases, daemon/background operations, eligible fleet UI, and an enabled tmux/worktree handoff.
3. **What does `UkS()` actually do?**  
   Answer: early handling, URI trampoline, narrow import rewrite, interactivity setup, and `jkS()` handoff—not all entrypoint/client classification previously attributed to it.
4. **Where is print optimization applied?**  
   Answer: in `jkS()` before heavier utility-command registration when no cc URI is present.
5. **Are server/ACP modes present?**  
   Answer: no; the page now says so explicitly.
6. **Are all children SIGTERM'd and escalated by one global rule?**  
   Answer: no. The old claim was replaced with global disposer behavior, ordered process phases, and owner-specific escalation.
7. **What is the main interactive setup entry?**  
   Answer: `qkS()` with `launchRepl` for fresh/resume/teleport/remote variants.

#### Round 2

No new source-answerable mechanism question was found. Detailed headless and session restoration logic remains in linked pages.

### `docs/01-runtime-lifecycle/daemon-and-background-service.md`

#### Round 1

1. **What are the current daemon entry/supervisor symbols?**  
   Answer: `daemonMain`, `krm()`, and bootstrap `ZIS()`/`vel(t)` routing.
2. **What is the local wire contract?**  
   Answer: newline-delimited JSON, first-line one-shot response, 5-second default timeout, persistent leases/subscriptions.
3. **How is compatibility handled?**  
   Answer: protocol version 1 only; `EPROTO` and restart guidance on mismatch.
4. **Which security checks are visible?**  
   Answer: peer UID where supported, 1 MiB cap/schema validation, and control-key checks for sensitive operations.
5. **Do configured registry workers pin a transient supervisor?**  
   Answer: no. Only leases and live background handles are counted; the page now states the explicit source log contract.
6. **When does a transient daemon exit?**  
   Answer: after startup/idle grace once the keep-alive sum is zero; default post-client grace is 5 seconds.
7. **How does takeover work?**  
   Answer: non-transient origins can ask transient to yield; transient never displaces; lock ownership is monitored.
8. **Can displaced cleanup unlink a successor socket?**  
   Answer: it is designed not to; `displaced` propagates `skipUnlink` and lock ownership is rechecked.
9. **Is service installation universally available?**  
   Answer: no. Templates exist but help/operations are gated; on-demand-only text is present.
10. **Is worker SIGKILL escalation global?**  
    Answer: no. The five-second escalation belongs to registry-worker ownership.

#### Round 2

No new source-answerable mechanism question was found. OS service-manager behavior outside the generated integration and unavailable host state remains platform-dependent.

#### Command follow-up

1. **What does `/background` transfer before the foreground exits?**
   Answer: it validates fleet/persistence/seed state, classifies transferable versus stopped work, serializes/checkpoints adoptable task state, attempts a bounded transcript flush, propagates model/effort/permissions/directories/agent settings, handles worktree ownership, dispatches a daemon worker, and exits only after successful handoff. Only the keep-parent fork makes its longer leaf-checkpoint/flush failure fatal.
2. **Does `/stop` delete the background session?**
   Answer: no. It persists a terminal `stopped` state, clears active job fields, emits detach framing when attached, and gracefully exits while retaining the transcript and worktree.

### `docs/01-runtime-lifecycle/accessibility-and-screen-reader-mode.md`

#### Round 1

1. **Which exact env strings are true and false?**  
   Answer: true `1|true|yes|on`; false `0|false|no|off`; trimmed and case-insensitive.
2. **What does an unrecognized value do?**  
   Answer: `Pe.triBool()` returns `undefined`, allowing the lower-priority setting to decide.
3. **Is the result recomputed on each access?**  
   Answer: no. Decision and source are cached until `$Bc.reset()`.
4. **Can the feature gate enable the mode by itself?**  
   Answer: no. It is a final veto over a requested mode.
5. **How does the mode propagate?**  
   Answer: `vrt()` contributes `CLAUDE_AX_SCREEN_READER=1` to covered child environments.

#### Round 2

No new source-answerable mechanism question was found. OS-level accessibility APIs remain outside the terminal implementation.

### `docs/01-runtime-lifecycle/conversation-termination.md`

#### Round 1

1. **What exactly qualifies the second call?**  
   Answer: backward scan finds the prior assistant call without intervening substantive user input; tool-result-only user frames receive special handling.
2. **Can a fork terminate the parent?**  
   Answer: no; fork/background-agent calls receive reflection/no-op behavior.
3. **When is the durable marker written?**  
   Answer: best-effort before abort and before interactive/headless terminal transition.
4. **Does marker failure cancel termination?**  
   Answer: no; it is logged, though later resume may lack durable state.
5. **Which exit code does headless termination use?**  
   Answer: 1 via `gracefulShutdown(1, ...)`.
6. **Which resume routes restore the marker?**  
   Answer: both direct/explicit resume and picker/search resume call `applyEndedByModelOnResume(...)`.
7. **Is marker collection unconditional?**  
   Answer: no; it is suppressed while `Y8n()` is active.

#### Round 2

No new source-answerable mechanism question was found. Rollout policy and model guidance remain build/gate dependent as already stated.

### `docs/01-runtime-lifecycle/architecture.md`

#### Round 1

1. **Are `--server`, `--headless`, and `--acp` actual root modes in this artifact?**  
   Answer: no. Their branches, handlers, priority claims, and design rationale were removed.
2. **What replaces those routes?**  
   Answer: explicit `ZIS()` specialized paths plus ordinary root-action headless/interactive/remote variants.
3. **What are the current composition-root boundaries?**  
   Answer: `ZIS()` is the process router, `UkS()` the normal-main trampoline, `jkS()` the command hub, and the root action the standard-session composition contract.
4. **Do specialized process roles run the standard composition contract?**  
   Answer: no. The page now scopes that contract to ordinary sessions.
5. **What is the shutdown contract?**  
   Answer: parallel per-registry drains plus ordered, single-claim process shutdown; no universal child escalation.
6. **Is startup setup strictly serial?**  
   Answer: no. The overstatement was replaced with async composition that intentionally overlaps work.

#### Round 2

No new source-answerable mechanism question was found. The corrected page now matches the detailed startup and daemon pages.

### `docs/01-runtime-lifecycle/commands-and-flags.md`

#### Round 1

1. **Does every command/flag reach Commander?**  
   Answer: no. Exact internal roles and operational families are consumed by `ZIS()` first.
2. **Where do URI and import rewriting occur?**  
   Answer: `UkS()` before `jkS()` parsing.
3. **What does the print fast path skip?**  
   Answer: heavier utility registration in `jkS()`, not the whole root program.
4. **Is print mode a `--headless` server?**  
   Answer: no; there is no such root option in this artifact.
5. **What values does the accessibility env override accept?**  
   Answer: exact true/false sets were added to the flag-family explanation.

#### Round 2

No new source-answerable mechanism question was found. The canonical option inventory remains delegated to `command-line-reference.md`.

## Final convergence pass

A complete second pass over all ten in-scope pages produced **zero new source-answerable mechanism questions**. Cross-page terminology now consistently uses:

- `ZIS()` for pre-main process routing;
- `UkS()` for the small normal-main trampoline;
- `jkS()` for the command hub;
- `qkS()`/`launchRepl` and `runHeadless` for ordinary execution projections;
- `daemonMain`/`krm()` for the background supervisor;
- `gracefulShutdown`/`bsi` for process-level versus registry-level cleanup.

The pass also verified that false root server/ACP modes and universal child-escalation claims no longer appear in the audited pages.

## Remaining evidence limits

1. **Wrapper-to-native runtime handoff:** wrapper/native package directories and extraction metadata were pruned. Extractor behavior and the Bun graph are confirmed; the exact end-user wrapper selection/`exec` chain is not directly observable in this retained checkout.
2. **Original source architecture:** semantic modules are reconstructed from bundled output. No original TypeScript module tree or sourcemap is claimed.
3. **Native add-on internals:** image/audio `.node` behavior is outside this JavaScript lifecycle audit.
4. **Platform-dependent checks:** daemon peer-credential support and launchd/systemd behavior vary by host. The docs state only the conditional checks/integration visible in source.
5. **Feature rollout:** service install, screen-reader mode, EndConversation, agent fleet, and other surfaces can be feature/policy gated. Presence in the bundle does not imply availability to every user.
6. **Owner-specific teardown:** the process coordinator's phases are known, but every subsystem's internal child/resource shutdown requires its own focused audit; no universal escalation behavior is inferred.

## Final status

- Audit mode: full analysis.
- Documentation changes: completed across all ten in-scope pages.
- New ledger: this file.
- Source atlas: intentionally untouched; the retained readable bundle supplied direct behavioral evidence, and the task did not request a package-version atlas regeneration.
- Convergence: achieved; final complete pass yielded zero new source-answerable questions.
- Validation status:
   - editor diagnostics reported no errors in all eleven runtime-audit files;
   - 142 relative Markdown file targets resolved across those files;
   - isolated `git diff --check` passed;
   - the Astro/Starlight production build completed successfully with 86 generated pages; its only warning was the existing large-bundle chunk advisory;
   - final Git accounting showed exactly ten modified target pages plus this new ledger, while concurrent changes outside that set remained excluded.

## Built-in command catalog follow-up — 2026-07-24

The original audit excluded pure command inventories. A later user request required a complete static built-in command audit, so the previously table-first `command-line-reference.md` became the canonical catalog without changing the original ten-page convergence result above.

Source tracing followed `Hur()`/`getBuiltinCommands()`, `_xo()`/`getCommands()`, `Lu()`/`fhs()`, surface filters, and `findCommand()`. The resulting reference now records:

- 105 distinct core names statically referenced by `Hur()` across its conditional branches;
- 32 expanded bundled-skill names from 29 registration sites;
- the duplicate `/design` name, producing 136 distinct core-plus-bundled candidates;
- TUI/text/prompt kinds and headless/remote/bridge/thin-client filters;
- aliases, account/provider/policy/platform/feature gates, disabled registrations, hidden support objects, compatibility shims, and non-advertised internal definitions; and
- links from every mechanism-bearing family to its existing domain owner.

`docs/01-runtime-lifecycle/README.md` now describes the reference as the complete core/bundled interactive catalog. Dynamic user, nested-workflow, plugin, and MCP names remain intentionally outside the static count because they are generated from runtime configuration. The post-edit reread found no unclassified static core or bundled name. **Follow-up status: edited and converged.**

## Full-system follow-up: terminal UI renderer and input — 2026-07-25

The cross-domain orphan pass found that screen-reader mode documented only the accessibility override; no page owned the normal TTY → renderer → input → cleanup lifecycle.

| Reader question | Source-confirmed answer | Documentation result |
|---|---|---|
| How is classic versus fullscreen selected? | `Zi()` applies process-role, background, accessibility, env, tmux-control, Windows-SSH, saved `tui`, and rollout decisions in that order; `N5e()` records the reason. | Created [Terminal UI renderer and input lifecycle](../01-runtime-lifecycle/terminal-ui-renderer-and-input.md) with the exact precedence. |
| Does `/tui` replace the renderer in place? | Normally it saves user settings, refuses active background work, checkpoints the current leaf, then relaunches/resumes with renderer env cleaned. A gated branch saves only the future preference. | Added save/live-switch/failure boundaries. |
| How does input reach UI handlers? | A reference-counted raw-mode controller parses byte chunks into response, paste, mouse, focus, suspend, wheel, and keyboard events; keyboard events enter focused keybinding scopes. | Added the byte-parser and dispatch architecture without duplicating every binding. |
| What owns alternate screen, resize, and suspend? | `Ser` enters/exits DEC alternate screen, tracks front/back frames and dimensions, listens for resize/`SIGCONT`, and restores terminal modes; `Ctrl+Z` releases and restores raw claims around `SIGTSTP`. | Added screen/state transitions and cleanup. |
| Does a renderer crash automatically fall back to classic? | No source-visible same-process fallback exists. Selection avoids known-incompatible hosts before mount; the root component error boundary exits on render failure. | Added the explicit non-guarantee. |

Direct source reads corrected the broad audit's “automatic crash fallback” implication and kept screen-reader behavior in its existing owner. The post-edit question pass produced zero new source-answerable terminal-lifecycle questions. **Focused follow-up status: new page, cross-linked, and converged.**
