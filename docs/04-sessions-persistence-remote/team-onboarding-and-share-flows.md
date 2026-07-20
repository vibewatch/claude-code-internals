# Team onboarding and share flows

`/team-onboarding` is a built-in, user-invoked automation workflow that scans recent local Claude Code usage, drafts an `ONBOARDING.md` guide, and optionally publishes an organization-scoped share link through `ShareOnboardingGuide`.

This subsystem already existed in the retained `2.1.143` baseline. The second-round audit promoted it because generated prompt shards were the only detailed coverage; the local transcript scan, guide contract, share API, policy gates, and failure behavior had no canonical hand-authored page.

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact string or symbol | Meaning |
|---|---:|---|---|
| OnboardingShareGate | [~422,520](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L422520) | `allow_team_onboarding`, `tengu_flint_harbor_share` | Controls hosted sharing. |
| OnboardingShareApi | [~422,550](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L422550) | `/api/organizations/:orgUUID/claude_code/onboarding` | List/create/update/delete organization guide API. |
| ShareGuideDescriptor | [~422,726](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L422726) | `ShareOnboardingGuide` | Tool schema, file limit, modes, and fallback statuses. |
| TranscriptUsageScanner | [~563,900](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L563900) | `lDd`, `dVy` | Scans recent JSONL sessions, slash commands, MCP usage, and repo metadata. |
| TeamOnboardingSkill | [~564,377](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L564377) | `name: "team-onboarding"` | User-only built-in prompt workflow that writes the guide. |
| OnboardingNudge | [~916,528](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L916528) | `team-onboarding-share` | UI hint that advertises the workflow. |

## Local generation flow

```mermaid
flowchart TD
    Invoke[/team-onboarding] --> Scan[Scan recent local session JSONL]
    Scan --> Usage[Commands + MCP counts + session descriptors]
    Usage --> Repo[Current git user/repository metadata]
    Repo --> Draft[Model drafts ONBOARDING.md]
    Draft --> Review[User reviews team name, tips, starter task]
    Review --> Final[Update ONBOARDING.md]
    Draft --> ShareGate{Hosted sharing enabled?}
    ShareGate -->|yes| DraftLink[ShareOnboardingGuide check]
    DraftLink --> Review
    Final -->|same short_code| UpdateLink[ShareOnboardingGuide update]
    ShareGate -->|no| Manual[Keep local file/manual sharing]
```

The skill is `disableModelInvocation: true`: users invoke `/team-onboarding` directly; the model does not autonomously decide to scan prior sessions. It requires a workspace and is controlled by policy `allow_team_onboarding`.

## Usage scan

The default window is 30 days. A feature-provided configuration may change it, but the runtime clamps it to 1–365 days.

For eligible local JSONL files, the scanner extracts:

- slash-command counts;
- MCP server/tool-use counts;
- up to 60 session descriptors containing a title, linked PR numbers, and/or the first meaningful user message;
- current Git user name;
- normalized `origin` repository (or workspace basename);
- `.mcp.json` server URL origins when available.

Files older than the window, non-regular files, and transcript files over 50 MiB are skipped. The scanner does not send full transcripts as its usage summary; it emits a bounded JSON aggregate and selected session descriptors for task-type classification. Nevertheless, first user messages and session titles can be included, so this is a deliberate local-history analysis initiated by the user.

## `ONBOARDING.md` contract

The bundled prompt asks the model to produce:

- a work-type breakdown derived from recent sessions;
- top skills/commands and MCP servers;
- repository and connector setup checklists;
- team tips and an optional starter task;
- an embedded instruction comment that turns the guide into an interactive onboarding walkthrough when a teammate later opens or pastes it into Claude Code.

The first draft is written immediately, then the user reviews the inferred team name and supplies optional tips/task context. The runtime records `teamOnboardingLastUsedAt` and emits aggregate counts, not the full guide, in onboarding telemetry.

## Hosted share lifecycle

Hosted sharing is a separate optional layer. `ShareOnboardingGuide` is enabled only when:

- nonessential traffic is allowed;
- organization policy `allow_team_onboarding` allows it;
- a stored OAuth login exists;
- `tengu_flint_harbor_share` is enabled.

Requests use `teleport-org` authentication, the normal OAuth beta header, and a ten-second timeout.

| Mode | Behavior |
|---|---|
| `check` (default) | Find a specified/latest guide. If local `ONBOARDING.md` exists, update that guide; if no local file exists, return its existing link; if no guide exists, fall through to creation. |
| `update` | Update a specified `short_code`, or the most recently updated guide when omitted; if none exists, create one. |
| `create` | Always create a new organization guide from local `ONBOARDING.md`. |
| `delete` | Delete a specified/latest guide and return `deleted`. |

The local file must be at the original working directory and no larger than 65,536 bytes. The result status is one of `created`, `updated`, `deleted`, `has_existing`, or `unavailable`, with optional `share_url` and `short_code`.

When sharing is available, the bundled workflow calls `check` after the draft and preserves the returned short code. After review, it calls `update` with that code so the same link reflects the final guide.

## Failure and fallback behavior

- Missing `ONBOARDING.md` returns `unavailable` with a write-the-guide-first message.
- A file over 64 KiB returns `unavailable` and asks the caller to trim it.
- API/auth/policy failures are converted to an `unavailable` result instead of aborting the whole onboarding workflow.
- If sharing is unavailable at either stage, the skill retains the local file and falls back to instructions for manual distribution.
- The source does not expose a short-code expiry contract; this page therefore treats the code only as the server-issued update/delete handle returned by the API.

## Related docs

- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md)
- [Skills system](../03-tools-integrations-security/skills-system.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md)
