# Tool inventory and schemas

This page is the canonical inventory for Claude Code tool names, tool families, schema owners, and permission boundaries. It consolidates lists that were previously repeated across tool, prompt, session, and agent pages.

## Scope and caveats

- This page lists source-visible tool names and schema-owning surfaces for the analyzed bundle.
- It does not duplicate every minified JSON Schema descriptor. Built-in descriptors are bundled in `cli.renamed.js`; MCP tools expose runtime `inputJSONSchema` through MCP; plugins contribute schemas through manifests.
- Tool visibility and tool execution are separate: a tool can be model-visible and still be denied by permissions, hooks, host control requests, or tool-specific guards.

## Source anchors

| Semantic alias | String or symbol | Meaning |
| --- | --- | --- |
| BashToolName | `var Rq="Bash"` | Shell-command tool name. |
| ReadToolName | `var Bq="Read"` | File-read tool name. |
| GlobToolName | `var B1="Glob"` | File-pattern search tool name. |
| GrepToolName | `var V9="Grep"` | Content-search tool name. |
| EditToolName | `var v7="Edit"` | File-edit tool name and nearby edit-family schemas. |
| WriteToolName | `var $9="Write"` | File-write tool name. |
| WebFetchToolName | `var gD="WebFetch"` | URL fetch tool name. |
| WebSearchToolName | `var RI="WebSearch"` | Web search tool name. |
| TodoWriteToolName | `var HV="TodoWrite"` | Todo list tool name. |
| SkillToolName | `var XX="Skill"` | Skill-loading tool name. |
| BashDescriptor | `LK({name:Rq,...})` | `Bash` descriptor with prompt, permission matcher, and read-only classifier. |
| ReadDescriptor | `LK({name:Bq,... get inputSchema(){return T15()}})` | `Read` descriptor with input/output schema accessors. |
| GrepDescriptor | `LK({name:V9,...})` | `Grep` descriptor with regex-search schema and read-only behavior. |
| GlobDescriptor | `LK({name:B1,...})` | `Glob` descriptor with file-pattern schema and read-only behavior. |
| EditDescriptor | `LK({name:v7,...})` | `Edit` descriptor with edit schema, storage stripping, and edit guards. |
| WriteDescriptor | `LK({name:$9,...})` | `Write` descriptor with file-write schema and permission dialog metadata. |
| WebFetchDescriptor | `LK({name:gD,... shouldDefer:!0})` | `WebFetch` descriptor and deferred web-fetch behavior. |
| WebSearchDescriptor | `LK({name:RI,...})` | `WebSearch` descriptor with provider gating. |
| TodoWriteDescriptor | `LK({name:HV,...})` | `TodoWrite` descriptor with allow-only checklist update path. |
| SkillDescriptor | `LK({name:XX,...})` | `Skill` descriptor with skill-name validation and forked execution output. |
| McpToolsListSchema | `tools/list` | MCP tool-list protocol schema. |
| ToolExecutionBoundary | `function U85` | Main tool execution/permission boundary. |
| PreToolUsePermissionHook | `hookPermissionResult`, `PreToolUse` | `PreToolUse` hook can allow, ask, deny, defer, or update input. |
| AgentToolContract | `Agents run in the background by default` | Delegated agents are asynchronous unless `run_in_background: false` is supplied. |
| WorkflowToolContract | `Execute a workflow script that orchestrates multiple subagents deterministically` | Dynamic workflows start in the background and report completion through task notifications. |
| ListAgentsContract | `ListAgents`, `Names are the address`, ` [ref]` | Lists addressable in-process, local, cloud, and Remote Control peers; a row reference disambiguates duplicate names. |
| ObserverReportContract | `ObserverReport` | One-way report channel installed in an observer agent's restricted tool set. |
| EndConversationContract | `END_CONVERSATION_TOOL_NAME = "EndConversation"` | Gated two-call conversation-termination lifecycle. |
| WaitForMcpServersContract | `WaitForMcpServers` | Waits briefly for pending MCP connections and reports connected/failed/auth/disabled states. |
| RefreshMcpToolsContract | `RefreshMcpTools`, status `refreshed` / `error` / `not_connected` | Re-queries live MCP tool lists without dialing disconnected servers. |
| HostedDiscoveryContracts | `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors`, `ListPlugins`, `SearchPlugins`, `ListSkills`, `SearchSkills` | First-party hosted discovery/list/card tools, not universal local CLI capabilities. |
| ProjectsToolContract | `ProjectsTool`, `CLAUDE_PROJECT_UUID` | Reads/searches/writes the one claude.ai Project attached to the session. |
| ArtifactToolContract | `ARTIFACT_TOOL_NAME = "Artifact"`, `ArtifactTool` | Publishes/lists/version-tracks hosted HTML or Markdown pages. |
| ClaudeDesignContracts | `DesignTool`, `DesignSyncTool` | Discovers collaborative design operations or synchronizes a local design system through path-scoped plans. |
| ShareOnboardingGuideContract | `ShareOnboardingGuide` | Creates, updates, finds, or deletes an organization-hosted `ONBOARDING.md` share. |
| ComputerUseMcpContract | `serverName = "computer-use"`, `--computer-use-mcp` | macOS in-process MCP with per-app approval, interaction tiers, and a cross-session lock. |
| DormantSendFileContract | `SendFileTool`, `isEnabled(){ return !1; }` | Fully implemented peer-file-transfer descriptor that is hard-disabled in this build. |

## Built-in tool families

| Family | Source-visible names | Model-visible capability | Main guard or owner |
|---|---|---|---|
| Shell/process | `Bash`, `BashOutput`-style task output aliases | Run commands, monitor background command/task output, stop long-running work. | Permission rules, sandbox policy, shell execution path. |
| File read/search | `Read`, `Glob`, `Grep` | Read files, expand patterns, and search content. | File permissions, ignore rules, `denyRead`-style exclusions. |
| File write/edit | `Edit`, `Write`, `MultiEdit`, `NotebookEdit` | Modify files and notebooks. | Read-before-write/edit checks and modified-after-read checks. |
| Web | `WebFetch`, `WebSearch` | Fetch URL/domain content or perform web search. | Domain/search permission validation and provider/tool support gates. |
| Planning/todos | `TodoWrite`, `ExitPlanMode` | Track plan state and exit plan mode. | Plan-mode state and prompt/context rules. |
| Skills and agents | `Skill`, `Agent`, `ListAgents`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `SendMessage`, observer-only `ObserverReport` | Load skills; dispatch/observe agents and tasks; enumerate/message addressable peers; let an observer report to its paired target. | Agent/task runtime, subagent hooks, task state registry, per-session spawn cap, observer pairing. |
| Deterministic orchestration | `Workflow` | Run a JavaScript workflow that coordinates many agents with shared concurrency/token budgets. | Workflow enablement/policy, usage warning, permission decision, workflow runtime. |
| MCP lifecycle | `WaitForMcpServers`, `RefreshMcpTools`, `ListMcpResources`, `ReadMcpResource`, `ReadMcpResourceDir` | Wait for pending connections, refresh live tool discovery, and browse/read MCP resources. | MCP connection state, server schema, normal permission boundary. |
| Hosted capability discovery | `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors`, `ListPlugins`, `SearchPlugins`, `SuggestPluginInstall`, `ListSkills`, `SearchSkills`, `SuggestSkills`, `propose_skills` | Discover or render first-party connector/plugin/skill choices and propose reusable skills. | Claude.ai auth/provider/remote-host and feature gates; card tools do not themselves install/connect capabilities. |
| Native computer control | `mcp__computer-use__*` | Inspect and control approved macOS applications through a dynamic MCP server. | macOS TCC, per-session app allowlist, application tiers, optional grants, and process lock. |
| Scheduled/monitor work | `CronCreate`, `CronDelete`, `CronList`, `ScheduleWakeup`, `Monitor`, `RemoteTrigger` | Schedule local prompts, arm plugin monitors, or manage gated remote routines. | Cron/monitor/plugin trust and remote-session policy. |
| Session/hosted lifecycle | `EndConversation`, `ShareOnboardingGuide` | End a qualifying conversation after reflection, or manage the optional organization-hosted onboarding guide. | Model/entrypoint/rollout gate plus durable marker; onboarding auth/policy/feature and local-file guards. |
| Hosted knowledge and creation | `Projects`, `Artifact`, `ClaudeDesign`, `DesignSync` | Read/write attached Project knowledge, publish hosted pages, and edit/synchronize collaborative design projects. | Account/provider/policy gates plus operation-specific local-read, consent, plan, grant, and destructive-write checks. |

## Schema ownership

| Tool source | How schemas are supplied | Permission behavior |
|---|---|---|
| Built-in tools | Bundled descriptors in `cli.renamed.js` near the tool definitions. This page summarizes fields by family rather than copying every minified descriptor. | Enters the same `ToolExecutionBoundary`. |
| MCP tools | MCP `tools/list` responses include names and `inputJSONSchema`; `tools/call` executes through the MCP client. | Permission-prompt routing requires a schema-bearing MCP tool; MCP calls still pass guarded runtime boundaries. |
| Plugin-provided tools/capabilities | Plugin manifests can contribute hooks, MCP servers, skills, agents, output styles, and related capability surfaces. | Plugin-provided capabilities compose with settings, trust, hooks, and permission policy. |
| Agent/task tools | Task/subagent tool constants are runtime tools exposed to the model or agent controller. | Task lifecycle hooks and task-state updates apply in addition to normal tool permission checks. |

## SDK-declared additions in `2.1.215`

The packaged `sdk-tools.d.ts` union adds the following schema owners relative to `2.1.143`. Presence in the declaration proves a contract shape, not universal availability: several are host-, account-, policy-, or feature-gated.

| Tool/schema | Confirmed role | Availability boundary |
|---|---|---|
| `Workflow` | Executes a named or inline deterministic multi-agent workflow and returns a background task ID. | `enableWorkflows`/`disableWorkflows`, org policy, usage confirmation, model/effort support. |
| `Monitor` | Arms a persistent background script whose stdout lines become task notifications. | Primarily plugin/host supplied; runs at hook-like trust, not as an ordinary sandboxed shell call. |
| `PushNotification` | Sends a mobile notification when the connected host/Remote Control surface permits it. | Remote Control and notification preference gates. |
| `RefreshMcpTools` | Re-runs `tools/list` on connected servers and reports added/removed tool names. | Never establishes a new connection; returns `not_connected` when no live client exists. |
| [`Projects`](../04-sessions-persistence-remote/hosted-projects-and-knowledge.md), [`Artifact`](artifact-publishing-and-live-pages.md), [`ClaudeDesign`](claude-design-and-design-sync.md) | Hosted Project knowledge, versioned page publication, and collaborative design RPC contracts. `DesignSync` is the fixed-schema design-system companion. | Host/account/provider/policy/feature gates; do not assume local CLI availability. |
| `RemoteTrigger` | Lists, creates, updates, or runs remote routines through the authenticated trigger API. | Claude.ai subscription, remote-policy, feature, and local-session gates. |
| `ReportFindings` | Returns structured code-review findings and optional fix outcomes. | Review workflows/hosts. |
| `ProposeSkills` | Returns structured skill proposals. | Host/bundled feature gate. |
| `REPL`, `ShowOnboardingRolePicker`, `SendFeedback` | Host-control and product-UX contracts. | Internal/hosted surfaces rather than guaranteed model-visible local tools. |

`Agent` and `WebSearch` also gained hard process-local budgets: defaults are 200 spawns and 200 searches per session, configurable with `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` and `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`. `/clear` resets the subagent budget.

## Runtime-only, hosted, and dormant descriptors

Not every runtime descriptor belongs to the SDK-declared addition list, and descriptor presence alone does not establish local availability.

| Surface | Confirmed runtime role | Availability interpretation |
|---|---|---|
| [`EndConversation`](../01-runtime-lifecycle/conversation-termination.md) | Requires two consecutive tool-call turns, persists `ended-by-model`, and aborts/blocks the conversation. | New in `2.1.215`; model-, feature-, entrypoint-, and mode-gated. |
| [`ObserverReport`](../06-agents-automation/observer-agents.md) | Delivers a concise one-way report to an observer's paired task/main session. | New in `2.1.215`; only meaningful inside an armed experimental observer. |
| `WaitForMcpServers` | Waits up to five seconds for selected/all pending servers and returns readiness buckets. | Enabled only while MCP clients are pending; it does not configure or authenticate a server. |
| `SearchMcpRegistry → SuggestConnectors`, `ListConnectors` | Searches connector directory UUIDs, resolves suggestion payloads, or lists installed organization connectors and `enabledInChat`. | First-party remote/hosted surface; suggestion/list calls do not connect or enable a connector. |
| `ListPlugins` / `SearchPlugins` / `SuggestPluginInstall`, `ListSkills` / `SearchSkills` / `SuggestSkills` | Lists enabled account capabilities, searches hosted catalogs, and renders out-of-band install/add cards. | First-party remote/hosted surface; distinct from local filesystem/plugin-marketplace loading. |
| [`ShareOnboardingGuide`](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md) | CRUD-style wrapper around the organization's onboarding-share API and local `ONBOARDING.md`. | OAuth, traffic, policy, and rollout gated; returns `unavailable` as a graceful fallback. |
| `SendFile` | Contains same-machine and bridge transfer implementations, digest verification, path permissions, and policy checks. | **Hard-disabled:** its descriptor returns `false` from `isEnabled()` in `2.1.215`. Do not document it as an available peer-transfer tool. This is distinct from gated `SendUserFile`, which delivers a file to the connected host/user. |

## Descriptor and execution-body map

The built-in tools are exposed through bundled descriptors created by `LK(...)`. Each descriptor owns the model-facing name, prompt text, input/output schema accessors, activity summaries, visibility gates, and permission helpers for that tool family. The full execution body is still bundled/minified, but the descriptor anchors identify where a focused per-tool deep dive should start.

| Tool family | Descriptor anchors | Runtime behavior confirmed from descriptor cluster | Remaining deep-dive boundary |
|---|---|---|---|
| Shell/process | `Bash` at line ~5147, `ToolExecutionBoundary` at line ~4202 | Shell calls enter the shared permission boundary, can classify read-only commands, and prepare a permission matcher before execution. | Full shell spawning, background process bookkeeping, and sandbox handoff belong in [Built-in tools and permissions](built-in-tools-and-permissions.md) and [Sandbox and isolation](sandbox-and-isolation.md). |
| File read/search | `Read` at line ~4956, `Glob` at line ~3104, `Grep` at line ~3095 | Read/search descriptors provide schema accessors, read-only/concurrency-safe markers, result limits, and search summaries. | Per-tool parsing of ranges, glob expansion, ignore handling, and truncation should be documented tool-by-tool only when needed. |
| File mutation | `Edit` at line ~5005, `Write` at line ~3226 | Mutation descriptors expose input/output schema accessors and pair with freshness guards such as `File has not been read yet...` and `File content has changed...`. | Exact patch/write algorithms and notebook edit shapes remain a candidate companion reference if schema dumps are required. |
| Web | `WebFetch` at line ~3438, `WebSearch` at line ~3628 | Web tools are deferred and guarded; `WebSearch` has provider-support gates and wildcard validation. | Provider-specific fetch/search transport is separate from tool-name/schema inventory. |
| Planning and automation | `TodoWrite` at line ~2621, `Skill` at line ~3172, task tool constants at line ~1091 | Todo writes are allowed checklist state updates; skills validate an invocation name and can return direct or forked execution results. | Full task/subagent scheduling belongs in [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md). |
| Hosted collaboration | `ProjectsTool` at line ~412606, `ArtifactTool` at line ~421819, `DesignTool`/`DesignSyncTool` around lines ~410125-411200 | Descriptors expose explicit read/destructive classifiers, account gates, structured schemas, and operation-specific permission helpers. | Read [Hosted Projects and knowledge](../04-sessions-persistence-remote/hosted-projects-and-knowledge.md), [Artifact publishing and live pages](artifact-publishing-and-live-pages.md), and [Claude Design and design-system sync](claude-design-and-design-sync.md). |

### Built-in schema extraction status

This page now records the descriptor owners for the major built-in tool schemas. It still intentionally avoids copying every minified `y.object(...)` / schema descriptor into the docs. A complete per-tool schema dump would need a dedicated extractor or focused manual reconstruction from each descriptor's `inputSchema` and `outputSchema` accessors. Until that exists, the safe documentation boundary is:

1. list stable tool names and descriptor anchors here;
2. document permission and execution behavior in implementation pages;
3. document MCP runtime schemas through MCP `tools/list` / `inputJSONSchema` rather than treating plugin/MCP schemas as built-ins.

## Input-surface summary

| Family | Representative input shape | Notes |
|---|---|---|
| Shell/process | Command text, optional background/task identifiers, sandbox-related settings. | Approved command execution can still be constrained by platform sandboxing. |
| File read/search | Path, glob/search pattern, context/range options. | Search/read behavior can honor ignore and deny rules. |
| File write/edit | Path plus content or edit patches; notebook tools include cell-level targets. | Edit/write tools enforce prior-read freshness before mutation. |
| Web | URL/domain or search query. | `WebFetch(domain:example.com)` is the permission form; `WebSearch` wildcard permissions are rejected. |
| Planning/todos | Todo/task entries and status transitions. | These shape plan visibility rather than external side effects. |
| Skill/agent/task | Skill IDs, prompts, agent specs, task IDs, messages, and task updates. | Subagent/task records can emit task frames and sidechain transcripts. |

## Visibility, approval, and execution

```mermaid
flowchart TD
    Registry[Built-ins + MCP + plugins + agents] --> Visible[Model-visible tool set]
    Flags[--tools / allow / deny flags] --> Visible
    Settings[settings and managed policy] --> Visible
    Visible --> Call[Model tool call]
    Call --> PreHook[PreToolUse]
    PreHook --> Decision[permission mode / allow-deny / host ask]
    Decision -->|deny| Denied[PermissionDenied + denial frame]
    Decision -->|ask| Host[can_use_tool control request]
    Decision -->|allow| Guards[tool-specific guards]
    Guards --> Execute[execute tool]
    Execute --> PostHooks[PostToolUse / telemetry / transcript]
```

High-signal guard strings include:

- `WebSearch does not support wildcards`
- `WebFetch permissions use domain format, not URLs`
- `File has not been read yet. Read it first before writing to it.`
- `File content has changed since it was last read.`

## Reference handoffs

| Need | Read |
|---|---|
| Permission boundary details and `ToolExecutionBoundary` flow | [Built-in tools and permissions](built-in-tools-and-permissions.md) |
| Command sandbox after approval | [Sandbox and isolation](sandbox-and-isolation.md) |
| MCP runtime and plugin loading | [MCP, plugins, and hooks](mcp-plugins-hooks.md) |
| Hook/event names and frame families | [Hooks and events reference](hooks-and-events-reference.md) |
| Settings/policy keys that shape tools | [Settings schema reference](settings-schema-reference.md) |
| Task/subagent tool behavior | [Agents, tasks, and subagents](../06-agents-automation/agents-tasks-and-subagents.md) |
| Observer pairing and one-way reports | [Observer agents](../06-agents-automation/observer-agents.md) |
| Model-ended session lifecycle | [Conversation termination](../01-runtime-lifecycle/conversation-termination.md) |
| macOS application control | [Computer-use MCP](computer-use-mcp.md) |
| Team guide generation and hosted sharing | [Team onboarding and share flows](../04-sessions-persistence-remote/team-onboarding-and-share-flows.md) |
| Attached claude.ai Project knowledge | [Hosted Projects and knowledge](../04-sessions-persistence-remote/hosted-projects-and-knowledge.md) |
| Hosted page publication and live updates | [Artifact publishing and live pages](artifact-publishing-and-live-pages.md) |
| Collaborative design and design-system sync | [Claude Design and design-system sync](claude-design-and-design-sync.md) |

## Related docs

- [Tool runtime, events, and integration flows](tool-runtime-events-and-integrations.md)
- [Built-in tools and permissions](built-in-tools-and-permissions.md)
- [MCP, plugins, and hooks](mcp-plugins-hooks.md)
- [Computer-use MCP](computer-use-mcp.md)
- [Hooks and events reference](hooks-and-events-reference.md)
- [Settings schema reference](settings-schema-reference.md)
- [Remote-environment egress and file staging](../04-sessions-persistence-remote/remote-environment-egress-and-file-staging.md)
