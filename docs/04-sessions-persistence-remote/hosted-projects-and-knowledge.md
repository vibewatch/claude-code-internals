# Hosted Projects and knowledge

The `Projects` tool in Claude Code `2.1.215` connects one session to one claude.ai Project: a shared knowledge container whose documents persist across Claude.ai chat, Cowork, and Claude Code. The runtime injects project metadata into context, supports read/search/write/delete operations, expands OAuth scopes when needed, and enforces local-file and project-size guards.

`ProjectsTool`, `allow_projects_tool`, and `CLAUDE_PROJECT_UUID`-driven project context are new relative to the retained `2.1.143` parent bundle.

## Source anchors

| Semantic alias | Approximate location in `cli.renamed.js` | Exact string or symbol | Meaning |
|---|---:|---|---|
| ProjectTransport | [~267,430-267,670](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267430) | `/api/organizations/:orgUUID/projects/`, `/v2/ccr-sessions/-/chat-project` | Direct and CCR-session project API routes. |
| ProjectAuthResolver | [~267,678-267,780](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267678) | `qZn`, `user:projects:read`, `user:projects:write` | Policy/provider/traffic checks and OAuth scope expansion. |
| AttachedProjectContext | [~267,800-268,050](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L267800) | `getProjectContextBlock`, `CLAUDE_PROJECT_UUID` | Fetches and formats the attached project's instructions/docs/files/sync sources. |
| ProjectsToolPrompt | [~411,950](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L411950) | `Read and write the claude.ai Project attached to this session` | Defines the one-project/no-discovery contract. |
| ProjectsOperations | [~412,100-412,550](../../claude-code-pkg/src/entrypoints/cli.renamed.js#L412100) | `project_info`, `project_read`, `project_search`, `project_write`, `project_delete` | Implements project knowledge operations. |
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

Fetch failure is logged and degrades to no attached-project block rather than aborting the session. The `Projects` tool remains the explicit operation surface.

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

Text at or below 256 KiB is returned inline. Larger text is written to a mode-`0600` temporary file and returned as `local_file`, allowing the normal `Read` tool to page it into context. Image and other non-document uploads are identified but not decoded by this path.

### Write namespacing and replacement

An existing path is replaced in place. A new bare filename is namespaced under `claude/` (for example `notes.md` becomes `claude/notes.md`) so agent-authored docs remain distinguishable from user uploads. An explicit nested path bypasses that default namespace.

Project documents are whole-document values: the edit pattern is read → modify locally/in context → write the complete replacement. There is no remote patch method.

### Local-file upload guard

`project_write` accepts exactly one of `content` or `local_path`. For `local_path`, the runtime:

1. resolves it under the original working directory;
2. rejects lexical and realpath escapes;
3. opens with `O_NOFOLLOW` (and nonblocking where available);
4. compares the opened file with a fresh path/stat result to catch replacement races;
5. requires a regular readable file;
6. rejects files over 25 MiB.

The file is uploaded directly by the tool path, so its body does not have to be copied into the model conversation.

### Knowledge budget

Before a write, the runtime estimates tokens as roughly `ceil(UTF-8 bytes / 4)` and refuses a write that would exceed `max_knowledge_size`. The error directs the caller to delete unused docs or split content rather than relying on a server-side overflow.

## Transport split

Normal attached sessions use organization project endpoints with `teleport-org` authentication. A session with the CCR/session access token instead dispatches operation names such as `detail`, `read-doc`, `write-doc`, and `kb-search` through `/v2/ccr-sessions/-/chat-project`. Both routes normalize into the same `ProjectsTool` result schema.

## Failure and security boundaries

- Project context and project documents are remote account data, not local workspace files; `Glob`/`Grep` cannot discover them.
- Synced sources are listed for context, but their content should be read through the matching connector rather than assumed to be copied into the Project document store.
- OAuth tokens are redacted from propagated error messages.
- `project_delete` cannot remove uploaded binary files.
- Tool presence in the SDK does not imply a project is attached; `CLAUDE_PROJECT_UUID` is mandatory.
- Compliance policy can disable the entire upload/read surface because project operations transmit workspace content to claude.ai.

## Related docs

- [Session API, events, and storage](session-api-events-and-storage.md)
- [Remote control and teleport](remote-control-and-teleport.md)
- [Prompt, context, and memory](../02-context-model-loop/prompt-context-memory.md)
- [Tool inventory and schemas](../03-tools-integrations-security/tool-inventory-and-schemas.md)
- [Claude Design and design-system sync](../03-tools-integrations-security/claude-design-and-design-sync.md)
