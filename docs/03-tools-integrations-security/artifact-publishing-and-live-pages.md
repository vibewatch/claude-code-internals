# Artifact publishing and live pages

`Artifact` is a new `2.1.215` hosted-tool module that renders a local HTML or Markdown file into a default-private page on claude.ai. It owns publication, listing, stable URL/version tracking, update conflict checks, optional live editing/capabilities, transcript restoration, and live-update notifications.

`ARTIFACT_TOOL_NAME = "Artifact"` and `ArtifactTool` are absent from the retained `2.1.143` parent bundle. This page documents the new runtime subsystem; it does not treat generated artifact prompt text as the sole behavioral proof.

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact string or symbol | Meaning |
|---|---:|---|---|
| ArtifactToolName | [~182,411](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L182411) | `ARTIFACT_TOOL_NAME = "Artifact"` | Stable model-facing tool name. |
| ArtifactEligibility | [~259,331-259,499](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L259331) | `isArtifactToolEligible`, `isArtifactToolEnabled` | Subscriber/provider, policy, feature, env, and preference gates. |
| ArtifactSessionRehydrator | [~421,100](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421100) | `frameUrls`, `artifactReadVersions`, `artifactRefs` | Rebuilds artifact state from transcript tool results. |
| ArtifactLiveSubscriber | [~421,300](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421300) | `frame-live.v1`, `Czu` | Arms a WebSocket monitor after eligible publishes and reports external updates. |
| ArtifactInputSchema | [~421,640](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421640) | `buildArtifactInputSchema` | Defines publish/list/live-edit inputs and optional runtime declarations. |
| ArtifactDescriptor | [~421,819](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L421819) | `ArtifactTool = Ai({...})` | Tool visibility, permissions, validation, execution, and result mapping. |
| ArtifactSizeLimit | [~376,009](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L376009) | `MAX_ARTIFACT_BYTES = 16777216` | Raw source-file limit: 16 MiB. |

## Availability boundary

The tool is not universally visible. The gate requires all of the following:

- a first-party Claude.ai subscriber session;
- no hard disable from `CLAUDE_CODE_DISABLE_ARTIFACT` or host settings;
- an eligible entrypoint (several SDK/action/MCP surfaces default off or are publish-excluded);
- organization policy `allow_cobalt_plinth` and an accepted subscription tier;
- the feature gate used by `tZn()`;
- `enableArtifact` not disabled by higher-priority policy/flag/user settings.

Restricted nonessential traffic also makes the hosted path ineligible. These checks explain why the SDK declaration proves a contract but not availability in every local session.

## Actions and data model

| Action | Read/write class | Behavior |
|---|---|---|
| `publish` (default/omitted) | Remote write | Reads `.html`, `.htm`, or `.md` from disk, renders/wraps it, and creates or updates a hosted page. `file_path` and a literal emoji `favicon` are required. |
| `list` | Read-only | Lists owned artifacts by default, or shared/all scopes when requested. The first listing at a scope asks before titles and links enter the conversation. |
| `live-edit` | Remote write | Applies bounded edit operations when the live-edit schema/gate is installed; unavailable builds reject it explicitly. |

Publishing can also carry a title/description/version label, a BCP-47 language tag when enabled, and optional runtime `capabilities`/`contract` declarations when those schema gates are open.

## Publish and update lifecycle

```mermaid
flowchart TD
    File[Local .html/.htm/.md file] --> Validate[Path permission + type + 16 MiB limit]
    Validate --> Target{Known target?}
    Target -->|same path this session| SessionUrl[Reuse frameUrls mapping]
    Target -->|explicit url| Existing[Parse owned artifact URL]
    Target -->|neither| New[Mint new artifact]
    SessionUrl --> Conflict[Version/base-version guard]
    Existing --> Conflict
    New --> Publish[publishArtifact]
    Conflict --> Publish
    Publish --> State[Update frameUrls + artifactReadVersions]
    State --> Transcript[Append frame-link transcript record]
    State --> Live[Optionally arm frame-live WebSocket]
```

### Stable identity

- Re-publishing the same file path in the same conversation reuses its session `frameUrls` entry.
- Updating an artifact from another conversation requires its URL; without it, a new URL is minted.
- `action: "list"` is the discovery route for an owned artifact whose URL is no longer in context.
- Shared artifacts can be listed/read but cannot be targeted by the owner-only update path.

### Version and concurrency safety

When base-version tracking is enabled, updating an existing slug requires a version previously observed by the session. The model must fetch the current artifact first or explicitly pass `force: true`. The normal path sends `baseVersion`, allowing the server to return a conflict instead of silently clobbering another session's update.

The runtime stores artifact read versions and published links in app state and reconstructs them from transcript records on resume. A successful publish appends a `frame-link` record with the session ID, path, URL, title, and timestamp.

## Permission boundaries

- Publishing always crosses local file-read permission and a hosted-publication confirmation boundary, except for narrowly recognized same-session private redeploys.
- Updating a shared-live page still asks because current viewers may see the change immediately.
- The first `list` call asks before titles/links from earlier sessions enter context; shared/all scopes separately account for untrusted titles written by other users.
- `live-edit` suppresses whole-tool allow rules and uses its own operation-level checks.
- Optional runtime capabilities are read back and carried forward carefully; omitting the field preserves stored declarations, while `{}` clears them.

## Live-update monitor

After an eligible interactive or SDK publish, the runtime can fetch a channel token and open:

`/edge-api/frame-live/<slug>/ws`

using subprotocol `frame-live.v1`. The monitor is persistent, sends a keepalive every 25 seconds, suppresses the publisher's own/catch-up versions, and injects a stale-copy notice if another session republishes the artifact. It is not armed in remote mode and respects WebSocket egress policy.

## Failure and caveat boundaries

- Only HTML/HTM/Markdown source files are accepted, and the raw file cannot exceed 16 MiB.
- Markdown and HTML follow different title/templating paths; an HTML `<title>` wins over the tool's `title` argument.
- Artifact pages start private, but sharing state affects later permission prompts and whether viewers see live updates or a pinned older version.
- Runtime capabilities, live editing, language tags, share-aware reads, and base-version checks are individually gated; do not infer all of them from the presence of `ArtifactTool` alone.

## Related docs

- [Tool inventory and schemas](tool-inventory-and-schemas.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [Settings, policy, and integrations](settings-policy-and-integrations.md)
- [Session resume and transcripts](../04-sessions-persistence-remote/session-resume-and-transcripts.md)
- [Claude Design and design-system sync](claude-design-and-design-sync.md)
