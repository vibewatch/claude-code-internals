# Full-system documentation coverage review

This review re-audits the complete Claude Code internals wiki against the retained `@anthropic-ai/claude-code@2.1.215` readable bundle. It asks a different question from the six domain ledgers: **after all focused follow-ups, which source-confirmed runtime lifecycles still lacked an adequate documentation owner anywhere in the system?**

The review was run on 2026-07-25 against:

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code@2.1.215` |
| Build time | `2026-07-19T00:01:04Z` |
| Git SHA | `316ce99628e89900bf0b1328fed3b8fec0c0c92d` |
| Primary behavioral source | [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) |
| Audit mode | Full analysis, repository-wide |
| Current canonical mechanism-page count | 63 |

`source-atlas/` was intentionally left untouched. This was not a package delta, and the retained readable bundle supplied enclosing control flow for every promoted finding.

## Review method

The audit used four passes:

1. **Documentation baseline:** read `docs/README.md`, `docs/SUMMARY.md`, all section guides, six mechanism ledgers, and canonical command/tool/hook/settings/environment/protocol references.
2. **Parallel domain reread:** independently reviewed runtime, context/model, tools/security, sessions/remote, operations/native, and agents/automation against `cli.renamed.js`.
3. **Cross-inventory orphan check:** compared source-visible commands, flags, tools, protocols, settings, env families, files, process roles, and host bridges with their lifecycle owners. A name in a reference table did not count as lifecycle coverage.
4. **Focused source confirmation:** traced each surviving candidate through setup, routing, state, permission, failure, cleanup, and persistence before deciding whether to patch or create a page.

Strings, generated prompt shards, SDK declarations, and module-atlas hits were discovery aids only. Claims were promoted only from enclosing runtime control flow.

## Domain result

| Domain | Prior state | Full-system result | Documentation action |
|---|---|---|---|
| Runtime lifecycle | Bootstrap, modes, daemon, commands, accessibility, termination, shutdown were deep. | The ordinary terminal renderer/input pipeline had no owner: classic/fullscreen selection, raw input, alternate screen, resize/suspend, `/tui` relaunch, and cleanup were scattered. | Created [Terminal UI renderer and input lifecycle](../01-runtime-lifecycle/terminal-ui-renderer-and-input.md). |
| Context and model loop | Prompt/context, memory, compaction, providers/auth, Fable, usage/quota, and headless streaming were deep. | No missing lifecycle page. One generic compatibility gap remained around historical per-turn effort statements and thinking-type retries. | Expanded [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md#per-turn-effort-and-thinking-compatibility). |
| Tools, integrations, and security | Tool boundary, MCP/plugins/hooks, settings, sandbox, status line, computer use, hosted tools, and skills were deep. | Claude in Chrome had only references/generated prompts; IDE dynamic MCP and plugin LSP had only a short synthesis. Both are independent, substantial lifecycles. | Created [Browser automation and Claude in Chrome](../03-tools-integrations-security/browser-automation-and-claude-in-chrome.md) and [IDE integration and LSP diagnostics](../03-tools-integrations-security/ide-integration-and-lsp-diagnostics.md). Added a bounded deferred-plugin-refresh note. |
| Sessions, persistence, and remote | Transcript chains, resume/fork/rewind, bridge/CCR, teleport, SDK/session APIs, hosted projects, onboarding, recording, and schemas were deep. | The original pass found no new page and clarified worktree ownership. A later independent string-surface pass found the remote-runner egress/sync/staging data plane hidden behind proxy/file literals. | Linked the worktree owner and later created [Remote-environment egress and file staging](../04-sessions-persistence-remote/remote-environment-egress-and-file-staging.md). |
| Operations and native support | Diagnostics, telemetry, feature gates, updater/doctor, safe mode, environment inventory, voice, and native media were deep. | The original theme-led pass found no material gap. The later string-surface pass traced the root `gateway` command into a complete embedded server lifecycle. | Created [Enterprise gateway server](../05-hosted-agent-ops/enterprise-gateway.md). |
| Agents and automation | Agents/tasks, messaging, teams, observers, scheduling, workflows, slash commands, cron, Monitor, and RemoteTrigger were deep. | Worktree isolation was spread across Agent prose, hooks, session persistence, settings, and generated tool prompts without one lifecycle owner. | Created [Worktree isolation and handoffs](../06-agents-automation/worktree-isolation-and-handoffs.md). |

## Promoted gaps

### Terminal UI renderer and input

The source-confirmed chain is:

```text
interactive root → Zi renderer choice → retained terminal tree → raw byte parser
→ focused keybinding dispatch → frame diff/alternate screen → resize/suspend/cleanup
```

Material anchors include `Zi()`/`N5e()` near line 196,887, `Eno.handleSetRawMode()` near 306,736, `Ser.enterAlternateScreen()`/`ensureInteractive()` near 310,538, and `/tui`'s `relaunchInto()` path near 827,500. Existing accessibility coverage correctly owned the screen-reader override but not the normal renderer lifecycle.

### Claude in Chrome

The integration has two packaged process roles and a larger state machine than a generic MCP row:

```text
setup/flags → dynamic stdio MCP → authenticated BridgeClient
→ extension discovery/browser selection → session tab group → browser tools

Chrome native messaging ↔ secure local socket pool (separate packaged transport role)
```

Representative anchors are the pre-main process roles near line 983,943; setup/manifest logic near 744,338; MCP/native-host entrypoints near 595,890; browser MCP adapter near 51,988; hosted bridge near 39,082; and auto/plan permission subsets near 447,003.

### IDE integration and LSP diagnostics

The audit separated two previously conflated paths:

```text
IDE lock file → dynamic ws-ide/sse-ide MCP → mcp__ide__ context/tools

enabled plugin → .lsp.json/manifest → lazy LSP subprocess
→ file synchronization → publishDiagnostics → bounded context attachment
```

IDE discovery/notification anchors are near 315,890–316,230 and `/ide` near 785,630. LSP configuration/dedup is near 317,000–317,420; subprocess/file sync near 320,700–321,560. Direct source correction established the actual diagnostic limits: 10 per file, 30 total, and 500 delivered-file identities.

### Worktree isolation and handoffs

The missing owner needed to join three shapes:

```text
EnterWorktree/ExitWorktree (session cwd)
Agent isolation:"worktree" (agent cwd)
background bgIsolation write guard
```

The lifecycle spans settings near 70,960; manager/locks/setup near 260,540–262,100; background edit guard near 321,950; tools near 404,350–405,050; hooks near 574,893; and transcript state near 582,145. The focused trace corrected two misleading inferences: `sparsePaths` uses Git sparse checkout, while `symlinkDirectories` is a separate post-checkout operation; `activeWorktreeSession` is project-keyed global config, not `.claude/settings.json`.

## Apparent gaps rejected

A broad source inventory produces many plausible false positives. These were explicitly rejected or narrowed:

| Candidate | Why it was not promoted as a new page |
|---|---|
| Monitor and `RemoteTrigger` | Already have source-anchored lifecycle coverage in agent runtime, cron, tool inventory, and feature-gate docs. |
| MCP connection sequencing and auto-backgrounding | Already covered in `mcp-plugins-hooks.md`, including always/deferred servers, pending wait, refresh, timeout/auth, and `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`. |
| Sandbox and permission decision order | Existing pages already trace platform initialization, wrapping, staged validation, hooks, permission replacements, denial, and execution. |
| Shutdown/signals/output drain | Runtime architecture and CLI main paths already document the single-claim shutdown phases, stdout drain, and owner-specific child escalation boundary. |
| Third-party model probes/upgrades | Existing model docs cover Bedrock/Vertex probes, startup fallback, stale-pin upgrade, and Mantle's tri-state result. |
| Total-token reminder controls | They are explicitly `@internal` and retained in generated prompt/schema references; no public lifecycle owner was justified. |
| `CLAUDE_BG_*` auth/rendezvous variables | Internal parent/worker protocol plumbing, not user configuration. Existing daemon/remote/sandbox docs own the visible lifecycle; exposing token env details as user knobs would be misleading. |
| Query-source enum completeness | Internal attribution vocabulary rather than an independent runtime lifecycle. |
| Unified WebFetch/WebSearch proxy page | Existing tool/runtime/provider/sandbox docs own the source-visible client behavior; CCR proxy service internals are outside the artifact. |
| Hosted collaboration “unified” page | `Projects`, onboarding share, team memory, Remote Control, and remote routines have distinct owners and should not be collapsed into a vague duplicate. |
| Full LSP refactoring/rename UX | The client advertises capabilities and has generic request plumbing, but no source-confirmed model-visible lifecycle for every editor operation. The new page retains this evidence boundary. |

## Corrections made during review

Independent audit reports were treated as hypotheses. Direct source reads corrected these material overclaims before documentation:

- LSP diagnostics are capped at **10/file and 30 total**, not inferred larger values.
- LSP configuration is contributed by enabled plugins in this path; it is not a general top-level settings root.
- LSP crash recovery is lazy on next use and bounded; it is not an unconditional immediate restart loop.
- Browser default tool timeout is **60 seconds**, bridge handshake watchdog **30 seconds**, and hidden tab bootstrap **8 seconds**.
- Chrome classifier “safe/read-only” sets are auto/plan decision subsets, not universal permission bypass lists.
- The normal Chrome MCP context supplies `bridgeConfig` and selects the hosted bridge; the native host/local sockets are a separate transport role.
- `worktree.sparsePaths` and `worktree.symlinkDirectories` are separate mechanisms.
- Worktree state is stored in global project config plus transcript state, not repository settings.
- Unknown/live worktree locks are preserved; cleanup fails safe rather than assuming ownership.

## Resulting ownership map

| Question | Canonical owner |
|---|---|
| Why did Claude choose classic or fullscreen, and how does terminal input flow? | [Terminal UI renderer and input lifecycle](../01-runtime-lifecycle/terminal-ui-renderer-and-input.md) |
| How does browser setup, pairing, tab isolation, permission, and reconnect work? | [Browser automation and Claude in Chrome](../03-tools-integrations-security/browser-automation-and-claude-in-chrome.md) |
| How do IDE discovery/MCP and plugin LSP diagnostics differ? | [IDE integration and LSP diagnostics](../03-tools-integrations-security/ide-integration-and-lsp-diagnostics.md) |
| How are worktrees created, locked, entered, persisted, retained, and removed? | [Worktree isolation and handoffs](../06-agents-automation/worktree-isolation-and-handoffs.md) |
| How are historical effort changes and thinking-type rejections represented? | [Model selection, calls, usage, quota, and billing](../02-context-model-loop/model-selection-usage-quota-billing.md#per-turn-effort-and-thinking-compatibility) |
| When can deferred plugin state refresh in a stream/headless run? | [Plugin lifecycle and configuration](../03-tools-integrations-security/plugin-lifecycle-and-configuration.md#reload-and-activation-boundaries) |

## Remaining evidence limits

1. **Server/service internals:** hosted bridge routing, Chrome extension implementation, cloud routines, server retention/quota, and remote consistency are outside the client artifact.
2. **IDE extensions:** VS Code/JetBrains UI, lock-file writer, and IDE-owned MCP tool schemas are not implemented in this bundle.
3. **Native/platform behavior:** terminal emulators, OS signals, Windows/macOS parity, Git/filesystem crash semantics, and stripped native modules vary outside readable JavaScript.
4. **Feature rollout:** source presence does not prove account, organization, platform, policy, or rollout availability.
5. **Original source architecture:** semantic symbols are reconstructed from a generated bundle; no original TypeScript module tree/source map is claimed.
6. **Future versions:** thresholds, tool schemas, gates, and minified anchors are pinned to `2.1.215`.

Within those boundaries, the original theme/page-led post-change pass found no remaining source-answerable subsystem that both lacked an owner and warranted another mechanism page. The independent string-surface follow-up below supersedes that absolute conclusion: it found two owners that the original inventories did not classify as standalone mechanisms.

## Information-architecture follow-up

The coverage review originally counted 62 mechanism pages. A later [documentation structure and duplication review](documentation-structure-review.md) found that `commands-and-flags.md` duplicated both the `cli-main-paths.md` routing narrative and the more complete `command-line-reference.md` inventory. Retiring it reduced the canonical count to **61** without removing any source-confirmed behavior.

That review also narrowed `agent-runtime-scheduling-and-completion.md` into [Agent steering, interruption, and completion](../06-agents-automation/agent-steering-interruption-and-completion.md), removed repeated session persistence/reconciliation algorithms from architecture/reference pages, and renamed the reader-facing operations chapter while preserving its stable route. Those ownership rules and retained-artifact boundaries remain valid.

## Independent string-surface follow-up

The later [Disassembled string-surface review](disassembled-string-surface-review.md) deliberately did not start from module themes or existing page names. It compared executable string categories and actual Commander registrations against authored docs, then traced surviving candidates through enclosing setup, state, failure, and cleanup code.

That pass promoted two independent lifecycle owners:

1. [Remote-environment egress and file staging](../04-sessions-persistence-remote/remote-environment-egress-and-file-staging.md) — local CONNECT-over-WebSocket relay, CA/tool trust, governed Git/`gh`, optimistic `/working` synchronization, `/uploads` filestore staging, and staged MCP file lanes.
2. [Enterprise gateway server](../05-hosted-agent-ops/enterprise-gateway.md) — native `gateway --config`, strict YAML/interpolation, Postgres migrations/retention, OIDC device auth, provider inference routing, managed settings, spend administration/metering, OTLP relay, health/readiness, and network hardening.

It also deepened existing owners for plugin evaluation, persistent Agent memory, Grove terms/privacy, prompt/paste history, `adopt.json`, hidden conversation import, auto-mode decision JSONL, MCP OAuth/XAA, CLI aliases/options, and operator/internal environment variables.

The follow-up rejected Frame as an Artifact alias, `/api/eval*` as GrowthBook rather than plugin eval, inactive ignore-pattern filenames as storage evidence, and thousands of telemetry/vendor/generated strings as independent mechanisms. Native binary review found no additional readable-source gap.

The canonical count is now **63**: 10 runtime + 8 context/model + 15 tools/security + 10 sessions/remote + 10 operations/native + 10 agents/automation. The information-architecture rule remains unchanged: a finding extends an existing owner unless it has a materially independent activation, state, authority, failure, and cleanup lifecycle.

## Original full-system validation

The metrics in this section describe the original full-system/IA pass before the later string-surface follow-up. The follow-up has its own fresh validation record in [Disassembled string-surface review](disassembled-string-surface-review.md#validation).

- Four independent source-versus-document reviews checked the terminal, Chrome, IDE/LSP, and worktree pages. Source-supported corrections were applied; contradictory suggestions (for example, relocating the already-correct worktree hook/relocation anchors) were rechecked and rejected.
- Editor diagnostics reported no errors across the final workspace changes.
- The changed-document link scan resolved all **1,038** relative Markdown targets across **30** changed/new Markdown files.
- `git diff --check` passed. A separate full-format scan covered every untracked page and final newlines in all 31 changed files; historical Markdown hard-break spaces in an older ledger were excluded from delta accounting rather than reformatted.
- Generated HTML contains the newly referenced `plugin-lsp-configuration`, `where-option-values-are-exposed`, `worktree-session-state`, `per-turn-effort-and-thinking-compatibility`, and `reload-and-activation-boundaries` fragment IDs.
- Astro/Starlight loaded **97** documentation sources and generated **98** static pages, including all four new mechanism pages and this review. Pagefind indexed all 98 HTML files and sitemap generation completed.
- The only build warning was Vite's existing advisory for chunks larger than 500 kB after minification.
- No path under `claude-code-pkg/` or `source-atlas/` changed.

**Full-system review status: complete, validated, and artifact-bounded for Claude Code `2.1.215`.**

## Related ledgers

- [Runtime mechanism question audit](mechanism-question-audit-runtime.md)
- [Context/model mechanism question audit](mechanism-question-audit-context-model.md)
- [Tools/security mechanism question audit](mechanism-question-audit-tools-security.md)
- [Sessions/remote mechanism question audit](mechanism-question-audit-sessions-remote.md)
- [Operations/native mechanism question audit](mechanism-question-audit-operations-native.md)
- [Agents/automation mechanism question audit](mechanism-question-audit-agents-automation.md)
