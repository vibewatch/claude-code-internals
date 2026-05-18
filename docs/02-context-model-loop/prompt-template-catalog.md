# Prompt template catalog

This page is a non-table index into the long string / template literals embedded in [`cli.renamed.js`](../../claude-code-pkg/src/entrypoints/cli.renamed.js) that look prompt-shaped (instructions to the model, tool descriptions, hook docs, agent files, etc.). The actual prompt bodies live under [`prompts/`](prompts/) — one file per category, each carrying the **full text** the bundle ships (template-literal interpolation sites are preserved as `${…}`).

The catalog is regenerated from the Babel AST by [`scripts/extract-prompt-catalog.mjs`](../../scripts/extract-prompt-catalog.mjs); machine-readable data lives at [`docs/99-research-atlas/data/prompt-catalog.json`](../99-research-atlas/data/prompt-catalog.json).

## Source provenance

- Input: `claude-code-pkg/src/entrypoints/cli.renamed.js` (23,273,325 bytes)
- SHA-256: `fd212af5897bf4f5b2c4eee2863ad46140d003abd8569adda2dd32b5857a495b`
- Generated: 2026-05-18
- AST parser: `@babel/parser` with `typescript` + `jsx` plugins, walked by `@babel/traverse`
- Minimum literal length: 120 characters
- String / template literals scanned: 167,464
- Candidates above length threshold: 2,265
- Kept after domain / noise filter: **1,086**

## Categories

### [system-context-memory](prompts/system-context-memory.md) — 46 prompts

Top-level system prompts, memory file blocks, `<environment>` / `<user_*>` reminders, and rolling conversation-summary scaffolding.

### [tool-description-or-guard](prompts/tool-description-or-guard.md) — 74 prompts

Tool descriptions, usage guards, and tool-output guidance — typically attached to a `LK({ ... })` tool registration.

### [security-permission](prompts/security-permission.md) — 72 prompts

Permission policy text, sandbox / credential rules, and security-relevant guardrails surfaced to the model or hooks.

### [task-and-agent](prompts/task-and-agent.md) — 27 prompts

Agent (subagent) definitions, Task tool descriptions, and managed-agents reference material.

### [mcp-plugin-hook](prompts/mcp-plugin-hook.md) — 190 prompts

MCP server / plugin / hook descriptions, event documentation, and schema `.describe(...)` text.

### [slash-command-or-agent-file](prompts/slash-command-or-agent-file.md) — 8 prompts

Embedded slash-command / sub-agent files (`---`-fenced frontmatter + body) shipped inside the bundle.

### [slash-output-style](prompts/slash-output-style.md) — 3 prompts

Output-style modifier prompts that change how Claude formats its reply for the current session.

### [structured-output](prompts/structured-output.md) — 8 prompts

Prompts that demand strict JSON-only or fixed-shape responses (`RESPOND WITH ONLY A VALID JSON OBJECT`, etc.).

### [misc-prompt-like](prompts/misc-prompt-like.md) — 658 prompts

Long literals that look prompt-shaped but did not match a more specific category.

## How candidates are filtered

A literal is kept if it satisfies every rule:

1. **Length** — at least 120 characters.
2. **Domain keyword** — contains at least one in-domain term (Claude, agent, tool, MCP, hook, plugin, skill, sandbox, permission, slash-command, memory, session, context window, model, prompt, `/loop`, `/dream`, `/schedule`, `/output-style`, `worktree`, `elicitation`, `PreToolUse`/`PostToolUse`/`UserPromptSubmit`/`SessionStart`/`SessionEnd`, etc.).
3. **Prose ratio** — the count of `{}()<>;=` characters is no more than 25 % of the alphabetic character count, dropping snippets that are mostly code.
4. **Not a known SDK / vendored noise pattern** — strings beginning with `Anthropic:`, `The model '`, `Using Claude with `, `Cannot `, `Could not `, `Unable to `, `Error: `, `TypeError: `, generic SDK validation strings, and bare URLs are dropped.

Each surviving literal is then assigned one category by checking, in order: `slash-command-or-agent-file` (YAML-fenced body), `slash-output-style`, `structured-output`, `mcp-plugin-hook`, `security-permission`, `task-and-agent`, `tool-description-or-guard`, `system-context-memory`. Anything that misses every probe lands in `misc-prompt-like`.

## Caveats

- The catalog is exhaustive for *literal* prompts above the length threshold that pass the filter. It does not capture prompts assembled at runtime from many short fragments.
- `enclosing` is the closest named function in the AST (`FunctionDeclaration` / `VariableDeclarator` / `ObjectProperty` / `ClassMethod`). When a literal lives at module top level the entry is marked `top-level`.
- Line numbers index into the regenerated `cli.renamed.js`. The byte offset (`0x…`) is stable across reformatting.
- Categories are heuristic. A prompt may legitimately belong to several categories; the rule order above picks one.
- Template-literal interpolation sites are shown as `${…}` rather than rendered — the runtime substitutes those at call time, so the body below is the static skeleton, not the rendered prompt sent to the model.

## Related docs

- [Prompt, context, and memory](prompt-context-memory.md)
- [Prompt assembly scenarios](prompt-assembly-scenarios.md)
- [Context, memory, compaction, checkpoints, and rewind](context-memory-compaction-checkpoints.md)
- [Models, providers, and auth](models-providers-auth.md)
- [Bundle module map (atlas)](../99-research-atlas/module-map-from-renamed-cli.md)
