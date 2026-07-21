# Hosted Projects and knowledge

The `Projects` tool in Claude Code `2.1.215` connects one session to one claude.ai Project: a shared knowledge container whose documents persist across Claude.ai chat, Cowork, and Claude Code. The runtime injects project metadata into context, supports read/search/write/delete operations, expands OAuth scopes when needed, and enforces local-file and project-size guards.

`ProjectsTool`, `allow_projects_tool`, and `CLAUDE_PROJECT_UUID`-driven project context are new relative to the retained `2.1.143` parent bundle.

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact string or symbol | Meaning |
|---|---:|---|---|
| ProjectTransport | [~267,430-267,670](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267430) | `/api/organizations/:orgUUID/projects/`, `/v2/ccr-sessions/-/chat-project` | Direct and CCR-session project API routes. |
| ProjectResponseGuard | [~267,630-267,675](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267630) | `qot`, `ProjectsApiError` | Rejects transport failures and every non-2xx response before operation decoding. |
| ProjectAuthResolver | [~267,678-267,780](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267678) | `qZn`, `user:projects:read`, `user:projects:write` | Policy/provider/traffic checks and OAuth scope expansion. |
| AttachedProjectContext | [~267,800-268,050](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267800) | `getProjectContextBlock`, `CLAUDE_PROJECT_UUID` | Fetches and formats the attached project's instructions/docs/files/sync sources. |
| ProjectsToolPrompt | [~411,950](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L411950) | `Read and write the claude.ai Project attached to this session` | Defines the one-project/no-discovery contract. |
| ProjectsOperations | [~412,100-412,550](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412100) | `project_info`, `project_read`, `project_search`, `project_write`, `project_delete` | Implements project knowledge operations. |
| ProjectReadSpill | [~412,260](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412260) | `project-doc-${r(e)}.txt`, `tool-results` | Stores large reads in the current local session's tool-result directory. |
| ProjectUploadIdentityGuard | [~412,170-412,255](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412170) | `O_NOFOLLOW`, `/proc/self/fd/${c.fd}`, `f.dev`, `f.ino` | Combines an optional opened-descriptor containment check with mandatory path/device and, when nonzero, inode comparisons. |
| ProjectsDescriptor | [~412,606](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412606) | `ProjectsTool = Ai({...})` | Tool schema, availability, classification, validation, and execution. |

## Attachment and availability

The harness binds a session to a project by setting `CLAUDE_PROJECT_UUID`. The model never supplies a project ID, and the tool offers no project discovery or switching operation. A different project requires a differently attached/restarted session.

Tool visibility requires both:

- organization policy `allow_projects_tool`; and
- a non-empty `CLAUDE_PROJECT_UUID`.

Execution then checks first-party provider/auth, nonessential-traffic policy, and the `user:projects:read` plus `user:projects:write` OAuth scopes. If a refresh token exists, the runtime can expand a normal Claude.ai login to include those scopes and returns a one-time notice. API-key-only, Bedrock, Vertex, traffic-restricted, or compliance-blocked sessions receive explicit precondition errors.

## Context injection

At startup, `getProjectContextBlock()` fetches project detail with a five-second timeout and adds a bounded block containing:

- project name, description, and custom instructions;
- document names and uploaded file kinds;
- synced-source descriptions (for example Google Drive, GitHub, Outline, or MCP resources);
- guidance to read/search relevant project knowledge before answering and to save only durable project-relevant outputs.

Fetch failure is logged and degrades to no attached-project block rather than aborting the session. This wrapper has a five-second context budget; ordinary tool requests use the project transport's 30-second request timeout. The `Projects` tool remains the explicit operation surface even when startup injection timed out or failed.

## Operation contract

| Method | Class | Behavior |
|---|---|---|
| `project_info` | Read-only | Returns name, description, instructions, docs, uploaded files, sync sources, and current/maximum knowledge size. |
| `project_read` | Read-only | Reads a text document or extracted text from an uploaded PDF/document. Non-document uploads return their `file_kind` without invented content. |
| `project_search` | Read-only | Queries the project knowledge base and returns RAG snippets/source IDs. A 403 from the search endpoint degrades to a document-name listing. |
| `project_write` | Destructive/write | Creates or fully replaces a text document from inline `content` or a local file. |
| `project_delete` | Destructive/write | Deletes a text document; uploaded files must be removed through claude.ai. |

The descriptor marks reads as read-only, writes/deletes as destructive, and the whole tool as not concurrency-safe.

## Read and write lifecycle

```mermaid
flowchart TD
    Session[Session with CLAUDE_PROJECT_UUID] --> Context[Fetch attached project context]
    Model[Model Projects call] --> Validate[Method/argument validation]
    Validate --> Auth[Policy + provider + OAuth scopes]
    Auth --> Route{Session JWT available?}
    Route -->|yes| CCR[/v2/ccr-sessions/-/chat-project]
    Route -->|no| Direct[/api/organizations/:orgUUID/projects/...]
    CCR --> Result[Structured tool result]
    Direct --> Result
```

### Read sizing

Text whose UTF-8 encoding is at or below 256 KiB is returned inline. Larger text is written to the current local session's `tool-results` directory and returned as `local_file`, allowing the normal `Read` tool to page it into context. The deterministic filename is `project-doc-<sanitized remote document-or-file UUID>.txt`; another large read of the same remote object overwrites that spill path rather than creating a per-call file. Image and other non-document uploads are identified but not decoded by this path.

The filename sanitizer preserves ASCII letters, digits, and hyphens and replaces every other character with `_`. That mapping is not injective: distinct remote identifiers that differ only in replaced punctuation can resolve to the same spill path and overwrite one another, in addition to the intended same-object overwrite.

The write requests mode `0o600` when creating the spill file, but does not chmod a pre-existing path. It uses ordinary `writeFile()` at that deterministic name rather than `O_NOFOLLOW` or an opened-descriptor identity check: a pre-existing symlink can redirect the write, and a later colliding large read can replace the returned path before its consumer opens it. There is no per-path serialization around overlapping spill writes, so concurrent reads that map to one path can race to truncate/replace the same file. The `local_file` value is therefore a mutable locator, not an immutable per-call snapshot. The Projects call does not unlink the file after returning. The normal retention sweep later removes stale files in session `tool-results` directories by filesystem `mtime`, subject to `cleanupPeriodDays` and its settings-safety gates. A spill-write failure propagates as a tool error rather than falling back to an oversized inline response.

### Write namespacing and replacement

An existing path is replaced in place from the tool caller's perspective. A new bare filename is namespaced under `claude/` (for example `notes.md` becomes `claude/notes.md`) so agent-authored docs remain distinguishable from user uploads. An explicit nested path bypasses that default namespace.

Project documents are whole-document values: the edit pattern is read → modify locally/in context → write the complete replacement. There is no remote patch method.

### Local-file upload guard

`project_write` accepts exactly one of `content` or `local_path`. For `local_path`, the runtime:

1. resolves it under the original working directory;
2. rejects lexical and realpath escapes (an in-tree symlink to an in-tree target can pass because the path is realpath-resolved first);
3. opens that resolved target with `O_NOFOLLOW` (and nonblocking where available);
4. best-effort resolves `/proc/self/fd/<fd>` and rejects a successfully resolved descriptor target outside the working directory;
5. always re-resolves the caller's path and compares its canonical path and device with the opened descriptor, plus inode when the opened inode is nonzero;
6. requires a regular readable file;
7. rejects files over 25 MiB.

The `/proc/self/fd` resolution is an additive Linux-style check rather than a mandatory dependency: failure to resolve it is ignored, after which the fresh path/device/inode comparisons still run. On a filesystem that reports an opened inode of zero, the inode comparison is skipped, leaving canonical-path and device equality as the replacement checks. The file is uploaded directly by the tool path, so its body does not have to be copied into the model conversation. None of these checks detects mutation of the same opened inode: another writer can truncate, extend, or change the file after the pre-read `fstat()`, and there is no post-read size check or content snapshot. The 25 MiB guard is therefore a checked pre-read size, not a lock-backed upload-body cap.

### Knowledge budget

Before a write, the runtime estimates tokens as roughly `ceil(UTF-8 bytes / 4)` and refuses a write that would exceed `max_knowledge_size`. This client check is conservative for replacement: it adds the full new payload estimate to the reported current size and does not subtract the document being replaced. It is also based on the preceding detail response rather than an atomic server reservation. The error directs the caller to delete unused docs or split content rather than relying on a server-side overflow.

## Transport split

Normal attached sessions use organization project endpoints with `teleport-org` authentication. A session with a CCR/session access token instead dispatches operation names such as `detail`, `read-doc`, `write-doc`, and `kb-search` through `/v2/ccr-sessions/-/chat-project`. Every non-2xx response is converted to `ProjectsApiError`; this layer has no source-visible automatic retry loop. Both routes normalize successful responses into the same `ProjectsTool` result schema.

Replacement ordering differs by route:

- the direct organization route updates an existing document with one `PATCH`;
- the CCR operation route implements replacement as `delete-doc` followed by `write-doc`, after checking cancellation before the pair begins.

The latter is not atomic in the client: if creation fails after deletion, the artifact shows no rollback. The tool is consequently marked not concurrency-safe, and callers should re-read before replacing a document whose concurrent modification would matter.

## Failure and security boundaries

- Project context and project documents are remote account data, not local workspace files; `Glob`/`Grep` cannot discover them.
- Synced sources are listed for context, but their content should be read through the matching connector rather than assumed to be copied into the Project document store.
- OAuth tokens are redacted from propagated error messages.
- `project_delete` cannot remove uploaded binary files.
- Tool presence in the SDK does not imply a project is attached; `CLAUDE_PROJECT_UUID` is mandatory.
- Compliance policy can disable the entire upload/read surface because project operations transmit workspace content to claude.ai.
- A knowledge-base search `403` is the one operation-specific degradation path: it returns the current document-name list with `rag: false`. Other API failures propagate as tool errors.
- Project identity is fixed by `CLAUDE_PROJECT_UUID` for the process; there is no source-visible mid-session switch or synchronized local document cache. Large reads do leave the session-scoped spill file described above until overwritten or removed by retention.
- Server-side versioning, conflict detection, retention, and consistency across direct and CCR routes are not established by the client artifact.

## Related docs

- [Session API, events, and storage](session-api-events-and-storage.md)
- [Remote control and teleport](remote-control-and-teleport.md)
- [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Claude Design and design-system sync](../03-tools-integrations-security/claude-design-and-design-sync.md)
