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
- up to 60 session descriptors containing a custom title, linked PR numbers, and/or the first simple string-form user-content match accepted by the scanner;
- current Git user name;
- normalized `origin` repository (or workspace basename);
- `.mcp.json` server URL origins when available.

Files older than the window by filesystem `mtime`, paths whose `stat()` result is not a regular file, and transcript files over 50 MiB are skipped. `stat()` follows symlinks, however, so a `.jsonl` symlink to a regular file can pass this check. The scanner stats every `.jsonl` directory entry in parallel and then reads every eligible path sequentially; there is no source-visible cap on file count. It does not bind the stat result to an opened descriptor or recheck size, so a path can be replaced—or grow beyond 50 MiB—before `readFile()`. Each resulting string is processed as newline-delimited records with regexes. Its `firstMessage` extraction is narrower than normal resume parsing: it only accepts a line containing `"role":"user"` whose `content` is a JSON string, excludes command records and array content, rejects short or `<...`-prefixed text, unescapes only `\n` and `\"`, and truncates to 200 characters. It is therefore a bounded descriptor heuristic, not the canonical “first meaningful message” helper.

If more than 60 descriptors qualify, the scanner scores title as 2 and any PR link as 1, sorts by that score, and keeps 60; equal-score ordering is inherited from the scan/sort implementation rather than a documented chronology guarantee. The usage summary does not include full transcripts, but selected user text and custom titles can be included, so this is deliberate local-history analysis initiated by the user.

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

Requests use `teleport-org` authentication, the normal OAuth beta header, and a ten-second timeout. The wrapper performs one API request per list/create/update/delete operation; no onboarding-specific retry loop is visible.

| Mode | Behavior |
|---|---|
| `check` (default) | With `short_code`, list and select the exact matching guide; otherwise select the guide whose `updated_at` string is greatest. If local `ONBOARDING.md` exists, update that guide; if the file is absent, return the existing link; if no guide matches, fall through to creation. |
| `update` | With a supplied `short_code`, send an update directly without first listing/confirming that code; a failed update returns `unavailable`. When omitted, update the latest listed guide or create a new guide if the list is empty. |
| `create` | Always create a new organization guide from local `ONBOARDING.md`. |
| `delete` | Delete a specified/latest guide and return `deleted`. |

The local path is fixed as `ONBOARDING.md` under the original working directory and must be no larger than 65,536 bytes according to a pre-read `stat()`. The helper does not require that stat target to be a regular file and, unlike the Projects `local_path` upload guard, does not use realpath containment, `O_NOFOLLOW`, or opened-descriptor identity checks: `stat()`/`readFile()` follow symlinks and leave a replacement or same-inode mutation race between the size check and upload read. There is no post-read byte check, so the uploaded body can exceed the nominal limit. The result status is one of `created`, `updated`, `deleted`, `has_existing`, or `unavailable`, with optional `share_url` and `short_code`.

When sharing is available, the bundled workflow calls `check` after the draft and preserves the returned short code. After review, it calls `update` with that code so the same link reflects the final guide.

The update-or-create fallback is ordered rather than atomic: lookup and file read happen before update/create, and there is no compare-and-swap version in the client request. The tool declares `isConcurrencySafe(): false`; concurrent callers can race latest-guide selection or overwrite one another. A failed update does not automatically create a replacement unless no target was found before the request.

## Failure and fallback behavior

- Missing `ONBOARDING.md` returns `unavailable` with a write-the-guide-first message.
- A file over 64 KiB returns `unavailable` and asks the caller to trim it.
- During transcript scanning, directory, `stat()`, and `readFile()` errors in the broad `Ko()` path-unavailable family (`ENOENT`, `EACCES`, `EPERM`, `ENOTDIR`, `ELOOP`, `ENAMETOOLONG`, `EROFS`) are skipped; errors outside that family propagate and can abort usage-summary generation.
- Share-file handling is narrower. `ENOENT` is the only local-path error treated as “missing.” In `check` mode, other local stat/read errors are caught by the mode wrapper and returned as `unavailable`; in the create/update fallthrough, non-`ENOENT` stat failures and pre-upload `readFile()` failures occur outside the API catch and propagate as tool errors. Both scanner and share paths follow filesystem symlinks rather than enforcing a no-follow boundary.
- API/auth/policy failures are converted to an `unavailable` result instead of aborting the whole onboarding workflow.
- If sharing is unavailable at either stage, the skill retains the local file and falls back to instructions for manual distribution.
- In `check`, an exact-code list lookup that finds no match behaves like “no guide” and can create one. `update` is different: a supplied code is sent directly to the update endpoint, so an absent/stale code fails rather than falling through to creation; only an omitted code with an empty latest-guide list creates.
- The source does not expose short-code expiry, access scope beyond the organization endpoint, revocation propagation, retention after delete, server conflict detection, or link-visibility guarantees. The code is only a server-issued lookup/update/delete handle in this client artifact.

## Related docs

- [Session resume and transcripts](session-resume-and-transcripts.md)
- [Slash commands and automation](../06-agents-automation/slash-commands-and-automation.md)
- [Skills system](../03-tools-integrations-security/skills-system.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Settings, policy, and integrations](../03-tools-integrations-security/settings-policy-and-integrations.md)
