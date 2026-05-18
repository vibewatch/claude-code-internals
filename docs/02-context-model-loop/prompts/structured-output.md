# Prompts — structured-output

8 prompts in this category.

Prompts that demand strict JSON-only or fixed-shape responses (`RESPOND WITH ONLY A VALID JSON OBJECT`, etc.).

Index: [Prompt template catalog](../prompt-template-catalog.md). Source: [`cli.renamed.js`](../../../claude-code-pkg/src/entrypoints/cli.renamed.js) (SHA-256 `fd212af5897bf4f5b2c4eee2863ad46140d003abd8569adda2dd32b5857a495b`).

Each entry shows the **full literal** as it appears in the bundle; `${…}` marks template-literal interpolation sites that the runtime substitutes at call time.

---

### prompt-0805

**Anchor:** [cli.renamed.js#L617798](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L617798) (0x127b53f) · **enclosing `Su5`** · **Kind:** template · **Length:** 2104 chars · **SHA-256:** `2447ccc9ea9e4c40…`

```text
You're writing an "At a Glance" summary for a Claude Code usage insights report for Claude Code users. The goal is to help them understand their usage and improve how they can use Claude better, especially as models improve. Use this 4-part structure: 1. **What's working** - What is the user's unique style of interacting with Claude and what are some impactful things they've done? You can include one or two details, but keep it high level since things might not be fresh in the user's memory. Don't be fluffy or overly complimentary. Also, don't focus on the tool calls they use. 2. **What's hindering you** - Split into (a) Claude's fault (misunderstandings, wrong approaches, bugs) and (b) user-side friction (not providing enough context, environment issues -- ideally more general than just one project). Be honest but constructive. 3. **Quick wins to try** - Specific Claude Code features they could try from the examples below, or a workflow technique if you think it's really compelling. (Avoid stuff like "Ask Claude to confirm before taking actions" or "Type out more context up front" which are less compelling.)

4. **Ambitious workflows for better models** - As we move to much more capable models over the next 3-6 months, what should they prepare for? What workflows that seem impossible now will become possible? Draw from the appropriate section below.

Keep each section to 2-3 not-too-long sentences. Don't overwhelm the user. Don't mention specific numerical stats or underlined_categories from the session data below. Use a coaching tone.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "whats_working": "(refer to instructions above)",
  "whats_hindering": "(refer to instructions above)",
  "quick_wins": "(refer to instructions above)",
  "ambitious_workflows": "(refer to instructions above)"
}

SESSION DATA:
${…}

## Project Areas (what user works on)
${…}

## Big Wins (impressive accomplishments)
${…}

## Friction Categories (where things go wrong)
${…}

## Features to Try
${…}

## Usage Patterns to Adopt
${…}

## On the Horizon (ambitious workflows for better models)
${…}
```

### prompt-0820

**Anchor:** [cli.renamed.js#L619009](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619009) (0x1289d49) · **top-level** · **Kind:** template · **Length:** 306 chars · **SHA-256:** `c1ffef43bdb49599…`

```text
Analyze this Claude Code usage data and identify project areas.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "areas": [
    {"name": "Area name", "session_count": N, "description": "2-3 sentences about what was worked on and how Claude Code was used."}
  ]
}

Include 4-5 areas. Skip internal CC operations.
```

### prompt-0821

**Anchor:** [cli.renamed.js#L619023](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619023) (0x1289edc) · **top-level** · **Kind:** template · **Length:** 464 chars · **SHA-256:** `792de63dd17ccea3…`

```text
Analyze this Claude Code usage data and describe the user's interaction style.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "narrative": "2-3 paragraphs analyzing HOW the user interacts with Claude Code. Use second person 'you'. Describe patterns: iterate quickly vs detailed upfront specs? Interrupt often or let Claude run? Include specific examples. Use **bold** for key insights.",
  "key_pattern": "One sentence summary of most distinctive interaction style"
}
```

### prompt-0822

**Anchor:** [cli.renamed.js#L619034](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619034) (0x128a106) · **top-level** · **Kind:** template · **Length:** 402 chars · **SHA-256:** `95ac49cb6ec1264a…`

```text
Analyze this Claude Code usage data and identify what's working well for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence of context",
  "impressive_workflows": [
    {"title": "Short title (3-6 words)", "description": "2-3 sentences describing the impressive workflow or approach. Use 'you' not 'the user'."}
  ]
}

Include 3 impressive workflows.
```

### prompt-0823

**Anchor:** [cli.renamed.js#L619049](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619049) (0x128a2f9) · **top-level** · **Kind:** template · **Length:** 512 chars · **SHA-256:** `25c570e32ce39938…`

```text
Analyze this Claude Code usage data and identify friction points for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence summarizing friction patterns",
  "categories": [
    {"category": "Concrete category name", "description": "1-2 sentences explaining this category and what could be done differently. Use 'you' not 'the user'.", "examples": ["Specific example with consequence", "Another example"]}
  ]
}

Include 3 friction categories with 2 examples each.
```

### prompt-0824

**Anchor:** [cli.renamed.js#L619064](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619064) (0x128a554) · **top-level** · **Kind:** template · **Length:** 2663 chars · **SHA-256:** `0bfad30c4ea89de8…`

```text
Analyze this Claude Code usage data and suggest improvements.

## CC FEATURES REFERENCE (pick from these for features_to_try):
1. **MCP Servers**: Connect Claude to external tools, databases, and APIs via Model Context Protocol.
   - How to use: Run `claude mcp add <server-name> -- <command>`
   - Good for: database queries, Slack integration, GitHub issue lookup, connecting to internal APIs

2. **Custom Skills**: Reusable prompts you define as markdown files that run with a single /command.
   - How to use: Create `.claude/skills/commit/SKILL.md` with instructions. Then type `/commit` to run it.
   - Good for: repetitive workflows - /commit, /review, /test, /deploy, /pr, or complex multi-step workflows

3. **Hooks**: Shell commands that auto-run at specific lifecycle events.
   - How to use: Add to `.claude/settings.json` under "hooks" key.
   - Good for: auto-formatting code, running type checks, enforcing conventions

4. **Headless Mode**: Run Claude non-interactively from scripts and CI/CD.
   - How to use: `claude -p "fix lint errors" --allowedTools "Edit,Read,Bash"`
   - Good for: CI/CD integration, batch code fixes, automated reviews

5. **Task Agents**: Claude spawns focused sub-agents for complex exploration or parallel work.
   - How to use: Claude auto-invokes when helpful, or ask "use an agent to explore X"
   - Good for: codebase exploration, understanding complex systems

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "claude_md_additions": [
    {"addition": "A specific line or block to add to CLAUDE.md based on workflow patterns. E.g., 'Always run tests after modifying auth-related files'", "why": "1 sentence explaining why this would help based on actual sessions", "prompt_scaffold": "Instructions for where to add this in CLAUDE.md. E.g., 'Add under ## Testing section'"}
  ],
  "features_to_try": [
    {"feature": "Feature name from CC FEATURES REFERENCE above", "one_liner": "What it does", "why_for_you": "Why this would help YOU based on your sessions", "example_code": "Actual command or config to copy"}
  ],
  "usage_patterns": [
    {"title": "Short title", "suggestion": "1-2 sentence summary", "detail": "3-4 sentences explaining how this applies to YOUR work", "copyable_prompt": "A specific prompt to copy and try"}
  ]
}

IMPORTANT for claude_md_additions: PRIORITIZE instructions that appear MULTIPLE TIMES in the user data. If user told Claude the same thing in 2+ sessions (e.g., 'always run tests', 'use TypeScript'), that's a PRIME candidate - they shouldn't have to repeat themselves.

IMPORTANT for features_to_try: Pick 2-3 from the CC FEATURES REFERENCE above. Include 2-3 items for each category.
```

### prompt-0825

**Anchor:** [cli.renamed.js#L619107](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619107) (0x128b023) · **top-level** · **Kind:** template · **Length:** 522 chars · **SHA-256:** `f203e0ca7e9708fb…`

```text
Analyze this Claude Code usage data and identify future opportunities.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence about evolving AI-assisted development",
  "opportunities": [
    {"title": "Short title (4-8 words)", "whats_possible": "2-3 ambitious sentences about autonomous workflows", "how_to_try": "1-2 sentences mentioning relevant tooling", "copyable_prompt": "Detailed prompt to try"}
  ]
}

Include 3 opportunities. Think BIG - autonomous workflows, parallel agents, iterating against tests.
```

### prompt-0826

**Anchor:** [cli.renamed.js#L619123](../../../claude-code-pkg/src/entrypoints/cli.renamed.js#L619123) (0x128b294) · **top-level** · **Kind:** template · **Length:** 371 chars · **SHA-256:** `e36a45bbd81298d1…`

```text
Analyze this Claude Code usage data and find a memorable moment.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "headline": "A memorable QUALITATIVE moment from the transcripts - not a statistic. Something human, funny, or surprising.",
  "detail": "Brief context about when/where this happened"
}

Find something genuinely interesting or amusing from the session summaries.
```
