#!/usr/bin/env node
// Extract prompt-like string / template literals from cli.renamed.js via Babel
// AST, write a JSON catalog with full text under
// docs/99-research-atlas/data/prompt-catalog.json, and regenerate
// docs/02-context-model-loop/prompt-template-catalog.md without tables.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = join(
  REPO_ROOT,
  "claude-code-pkg",
  "src",
  "entrypoints",
  "cli.renamed.js",
);
const DATA_PATH = join(
  REPO_ROOT,
  "docs",
  "99-research-atlas",
  "data",
  "prompt-catalog.json",
);
const PAGE_PATH = join(
  REPO_ROOT,
  "docs",
  "02-context-model-loop",
  "prompt-template-catalog.md",
);
const SHARDS_DIR = join(
  REPO_ROOT,
  "docs",
  "02-context-model-loop",
  "prompts",
);

const MIN_LEN = 120;
const CLI_REL_FROM_PAGE = "../../claude-code-pkg/src/entrypoints/cli.renamed.js";

// A literal must look like a Claude Code-domain instruction / description, not
// vendored SDK error strings or generic library messages. We require at least
// one in-domain keyword AND we drop a small set of clear noise patterns.
const DOMAIN_KEYWORDS = /\b(Claude(?!\s*API\s+\u2014?\s*ok)|claude\.md|agent|sub[- ]?agent|tool[s]?\b|MCP|plugin|hook[s]?|skill|sandbox|permission|slash[- ]?command|\/loop|\/dream|\/schedule|\/output-style|memory|session(?:Id|s)?|context window|model|prompt|user_environment|allowed-tools|conversation|managed-agents|teleport|remote control|CCR|coordinator|worktree|background[- ]?(job|session)|elicitation|PreToolUse|PostToolUse|UserPromptSubmit|SessionStart|SessionEnd|StopFailure|spec[- ]?write|focus mode|scratchpad)\b/i;

const SDK_NOISE_PATTERNS = [
  /^`?fetch`? is not defined/i,
  /^Cannot stringify type/i,
  /^If your federation rule/i,
  /^Ensure your federation rule/i,
  /^oidc_federation config requires/i,
  /^The \w+ argument must/i,
  /^Could not parse content type/i,
  /^Expected .* to be of type/i,
  /^Invalid value for/i,
  /^You are about to download/i,
  /^Polyfill/i,
  /^https?:\/\/[^\s]+$/, // bare URLs
  /^Anthropic:\s/i,            // SDK deprecation warnings
  /^The model '/i,             // model deprecation warnings
  /^Using Claude with /i,      // thinking-type deprecation
  /^Unable to parse tool parameter JSON/i, // SDK error
  /^You can't pass a `?stream`?/i,
  /^Failed to /i,
  /^Cannot /i,
  /^Could not /i,
  /^Unable to /i,
  /^Error: /i,
  /^TypeError: /i,
];

function isPromptShaped(text, enclosing) {
  // 1. Drop clear SDK / vendored library noise
  for (const re of SDK_NOISE_PATTERNS) {
    if (re.test(text.trim())) return false;
  }
  // 2. Drop if it's overwhelmingly code (lots of braces/parens vs words)
  const codeChars = (text.match(/[{}();=<>]/g) || []).length;
  const letterChars = (text.match(/[A-Za-z]/g) || []).length;
  if (letterChars > 0 && codeChars / letterChars > 0.25) return false;
  // 3. Must contain at least one in-domain keyword
  if (!DOMAIN_KEYWORDS.test(text)) return false;
  return true;
}

function categorize(text) {
  const t = text;
  if (/^\s*---\s*\n[\s\S]*?\n---\s*\n/.test(t)) return "slash-command-or-agent-file";
  if (/output[-_ ]style/i.test(t) && /\b(persona|tone|style|reply|response)\b/i.test(t)) {
    return "slash-output-style";
  }
  if (/(RESPOND WITH ONLY|VALID JSON OBJECT|Respond with just|Return ONLY)/.test(t)) {
    return "structured-output";
  }
  if (/\b(MCP|PreToolUse|PostToolUse|UserPromptSubmit|SessionStart|SessionEnd|Elicitation|elicitation)\b/.test(t)
      || /\bmcp[-_ ]server\b/i.test(t)
      || /\bhook[- ]?(event|input|output|name)\b/i.test(t)
      || /\bplugin\b/i.test(t)) {
    return "mcp-plugin-hook";
  }
  if (/\b(MUST (NOT |never |avoid )|never (write|save|expose|leak)|API keys|secrets|credentials|sandbox|dangerouslyDisableSandbox|workspace trust)\b/i.test(t)
      || /\bpermission[ _-]?(mode|prompt|decision)\b/i.test(t)) {
    return "security-permission";
  }
  if (/\b(Use this agent|agent loop|subagent|spawn (a|an) (sub)?agent|Task tool|managed agent)\b/i.test(t)) {
    return "task-and-agent";
  }
  if (/\b(Use this tool|Usage notes|Reads a file|Writes a file|Bash tool|This tool|grep|ripgrep|tool description|allowed-tools)\b/i.test(t)) {
    return "tool-description-or-guard";
  }
  if (/\b(CLAUDE\.md|memory file|<user_|<environment|system[ -]reminder|sessionId|context window|conversation summary)\b/i.test(t)
      || /^#\s+(About The User|Claude API|Model Migration|Files API|Message Batches|Managed Agents|Tool Use)/.test(t)) {
    return "system-context-memory";
  }
  return "misc-prompt-like";
}

function getEnclosingFunctionName(path) {
  const fp = path.getFunctionParent();
  if (!fp) return "";
  const node = fp.node;
  if (node.id && node.id.name) return node.id.name;
  const parent = fp.parentPath ? fp.parentPath.node : null;
  if (!parent) return "";
  if (parent.type === "VariableDeclarator" && parent.id && parent.id.name) {
    return parent.id.name;
  }
  if (parent.type === "AssignmentExpression") {
    const left = parent.left;
    if (left.type === "Identifier") return left.name;
    if (left.type === "MemberExpression" && left.property && left.property.name) {
      return left.property.name;
    }
  }
  if (parent.type === "ObjectProperty" && parent.key) {
    return parent.key.name || (parent.key.value ? String(parent.key.value) : "");
  }
  if (parent.type === "ObjectMethod" && parent.key) {
    return parent.key.name || (parent.key.value ? String(parent.key.value) : "");
  }
  if (parent.type === "ClassMethod" && parent.key) {
    return parent.key.name || (parent.key.value ? String(parent.key.value) : "");
  }
  return "";
}

function templateText(node) {
  const parts = [];
  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.cooked ?? node.quasis[i].value.raw ?? "");
    if (i < node.expressions.length) parts.push("${\u2026}");
  }
  return parts.join("");
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function main() {
  console.error(`[prompt-catalog] reading ${CLI_PATH}`);
  const source = await readFile(CLI_PATH, "utf8");
  const inputBytes = Buffer.byteLength(source, "utf8");
  const inputSha = sha256Hex(source);
  console.error(`[prompt-catalog] parsing (${(inputBytes / 1024 / 1024).toFixed(2)} MiB)`);
  const ast = parse(source, {
    sourceType: "unambiguous",
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins: ["typescript", "jsx"],
  });
  console.error(`[prompt-catalog] walking AST`);

  let totalLiterals = 0;
  const candidates = [];
  traverse(ast, {
    StringLiteral(path) {
      totalLiterals++;
      const text = path.node.value;
      if (text.length < MIN_LEN) return;
      const start = path.node.start ?? 0;
      const loc = path.node.loc ? path.node.loc.start.line : 0;
      const raw = path.node.extra && path.node.extra.raw;
      const kind = raw && raw.startsWith("'") ? "string-single" : "string-double";
      candidates.push({
        text,
        kind,
        line: loc,
        offsetHex: "0x" + start.toString(16),
        enclosingFunction: getEnclosingFunctionName(path),
      });
    },
    TemplateLiteral(path) {
      totalLiterals++;
      // Skip when inside tagged template (less likely to be a prompt)
      const text = templateText(path.node);
      if (text.length < MIN_LEN) return;
      const start = path.node.start ?? 0;
      const loc = path.node.loc ? path.node.loc.start.line : 0;
      candidates.push({
        text,
        kind: "template",
        line: loc,
        offsetHex: "0x" + start.toString(16),
        enclosingFunction: getEnclosingFunctionName(path),
      });
    },
  });

  console.error(`[prompt-catalog] ${totalLiterals} string/template literals total, ${candidates.length} candidates ≥${MIN_LEN} chars`);

  // Apply prompt-shape filter
  const filtered = candidates.filter((c) => isPromptShaped(c.text, c.enclosingFunction));
  console.error(`[prompt-catalog] ${filtered.length} prompt-shaped after domain/noise filter`);

  filtered.sort((a, b) => a.line - b.line || (a.offsetHex < b.offsetHex ? -1 : 1));

  // Assign sequential IDs across prompt-shaped candidates
  filtered.forEach((c, i) => {
    c.id = "prompt-" + String(i + 1).padStart(4, "0");
    c.category = categorize(c.text);
    c.length = c.text.length;
    c.sha256_16 = sha256Hex(c.text).slice(0, 16);
  });

  const byCategory = {};
  for (const c of filtered) {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }

  const out = {
    generated_at: new Date().toISOString().slice(0, 10),
    input_path: "claude-code-pkg/src/entrypoints/cli.renamed.js",
    input_bytes: inputBytes,
    input_sha256: inputSha,
    total_literals: totalLiterals,
    candidates_count: filtered.length,
    candidates_pre_filter: candidates.length,
    min_length: MIN_LEN,
    category_counts: byCategory,
    prompts: filtered,
  };

  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(out, null, 2));
  console.error(`[prompt-catalog] wrote ${DATA_PATH}`);

  // Write the index page and per-category shards
  await mkdir(SHARDS_DIR, { recursive: true });
  const indexMd = renderIndex(out);
  await writeFile(PAGE_PATH, indexMd);
  console.error(`[prompt-catalog] wrote ${PAGE_PATH} (${(Buffer.byteLength(indexMd, "utf8") / 1024).toFixed(1)} KiB)`);

  const groups = new Map();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const p of filtered) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  }
  for (const cat of CATEGORY_ORDER) {
    const prompts = groups.get(cat) || [];
    if (prompts.length === 0) continue;
    const shardPath = join(SHARDS_DIR, `${cat}.md`);
    const shardMd = renderShard(cat, prompts, out);
    await writeFile(shardPath, shardMd);
    console.error(`[prompt-catalog] wrote ${shardPath} (${(Buffer.byteLength(shardMd, "utf8") / 1024).toFixed(1)} KiB, ${prompts.length} prompts)`);
  }
}

const CATEGORY_ORDER = [
  "system-context-memory",
  "tool-description-or-guard",
  "security-permission",
  "task-and-agent",
  "mcp-plugin-hook",
  "slash-command-or-agent-file",
  "slash-output-style",
  "structured-output",
  "misc-prompt-like",
];

const CATEGORY_BLURB = {
  "system-context-memory": "Top-level system prompts, memory file blocks, `<environment>` / `<user_*>` reminders, and rolling conversation-summary scaffolding.",
  "tool-description-or-guard": "Tool descriptions, usage guards, and tool-output guidance — typically attached to a `LK({ ... })` tool registration.",
  "security-permission": "Permission policy text, sandbox / credential rules, and security-relevant guardrails surfaced to the model or hooks.",
  "task-and-agent": "Agent (subagent) definitions, Task tool descriptions, and managed-agents reference material.",
  "mcp-plugin-hook": "MCP server / plugin / hook descriptions, event documentation, and schema `.describe(...)` text.",
  "slash-command-or-agent-file": "Embedded slash-command / sub-agent files (`---`-fenced frontmatter + body) shipped inside the bundle.",
  "slash-output-style": "Output-style modifier prompts that change how Claude formats its reply for the current session.",
  "structured-output": "Prompts that demand strict JSON-only or fixed-shape responses (`RESPOND WITH ONLY A VALID JSON OBJECT`, etc.).",
  "misc-prompt-like": "Long literals that look prompt-shaped but did not match a more specific category.",
};

function escapeFence(text) {
  if (!text.includes("```")) return { fence: "```", text };
  let n = 4;
  while (text.includes("`".repeat(n))) n++;
  const fence = "`".repeat(n);
  return { fence, text };
}

function metaLine(p, cliRelPath) {
  const link = `[cli.renamed.js#L${p.line}](${cliRelPath}#L${p.line})`;
  const enclosing = p.enclosingFunction
    ? `enclosing \`${p.enclosingFunction}\``
    : "top-level";
  return `**Anchor:** ${link} (${p.offsetHex}) · **${enclosing}** · **Kind:** ${p.kind} · **Length:** ${p.length} chars · **SHA-256:** \`${p.sha256_16}…\``;
}

function renderPrompt(p, cliRelPath) {
  const { fence, text } = escapeFence(p.text);
  const lines = [];
  lines.push(`### ${p.id}`);
  lines.push("");
  lines.push(metaLine(p, cliRelPath));
  lines.push("");
  lines.push(fence + "text");
  lines.push(text);
  lines.push(fence);
  lines.push("");
  return lines.join("\n");
}

function renderIndex(out) {
  const lines = [];
  lines.push("# Prompt template catalog");
  lines.push("");
  lines.push("This page is a non-table index into the long string / template literals embedded in [`cli.renamed.js`](" + CLI_REL_FROM_PAGE + ") that look prompt-shaped (instructions to the model, tool descriptions, hook docs, agent files, etc.). The actual prompt bodies live under [`prompts/`](prompts/) — one file per category, each carrying the **full text** the bundle ships (template-literal interpolation sites are preserved as `${\u2026}`).");
  lines.push("");
  lines.push("The catalog is regenerated from the Babel AST by [`scripts/extract-prompt-catalog.mjs`](../../scripts/extract-prompt-catalog.mjs); machine-readable data lives at [`docs/99-research-atlas/data/prompt-catalog.json`](../99-research-atlas/data/prompt-catalog.json).");
  lines.push("");
  lines.push("## Source provenance");
  lines.push("");
  lines.push(`- Input: \`${out.input_path}\` (${out.input_bytes.toLocaleString()} bytes)`);
  lines.push(`- SHA-256: \`${out.input_sha256}\``);
  lines.push(`- Generated: ${out.generated_at}`);
  lines.push(`- AST parser: \`@babel/parser\` with \`typescript\` + \`jsx\` plugins, walked by \`@babel/traverse\``);
  lines.push(`- Minimum literal length: ${out.min_length} characters`);
  lines.push(`- String / template literals scanned: ${out.total_literals.toLocaleString()}`);
  lines.push(`- Candidates above length threshold: ${out.candidates_pre_filter.toLocaleString()}`);
  lines.push(`- Kept after domain / noise filter: **${out.candidates_count.toLocaleString()}**`);
  lines.push("");
  lines.push("## Categories");
  lines.push("");
  for (const cat of CATEGORY_ORDER) {
    const count = out.category_counts[cat] || 0;
    if (count === 0) continue;
    lines.push(`### [${cat}](prompts/${cat}.md) — ${count} prompt${count === 1 ? "" : "s"}`);
    lines.push("");
    lines.push(CATEGORY_BLURB[cat]);
    lines.push("");
  }
  lines.push("## How candidates are filtered");
  lines.push("");
  lines.push("A literal is kept if it satisfies every rule:");
  lines.push("");
  lines.push(`1. **Length** — at least ${out.min_length} characters.`);
  lines.push("2. **Domain keyword** — contains at least one in-domain term (Claude, agent, tool, MCP, hook, plugin, skill, sandbox, permission, slash-command, memory, session, context window, model, prompt, `/loop`, `/dream`, `/schedule`, `/output-style`, `worktree`, `elicitation`, `PreToolUse`/`PostToolUse`/`UserPromptSubmit`/`SessionStart`/`SessionEnd`, etc.).");
  lines.push("3. **Prose ratio** — the count of `{}()<>;=` characters is no more than 25 % of the alphabetic character count, dropping snippets that are mostly code.");
  lines.push("4. **Not a known SDK / vendored noise pattern** — strings beginning with `Anthropic:`, `The model '`, `Using Claude with `, `Cannot `, `Could not `, `Unable to `, `Error: `, `TypeError: `, generic SDK validation strings, and bare URLs are dropped.");
  lines.push("");
  lines.push("Each surviving literal is then assigned one category by checking, in order: `slash-command-or-agent-file` (YAML-fenced body), `slash-output-style`, `structured-output`, `mcp-plugin-hook`, `security-permission`, `task-and-agent`, `tool-description-or-guard`, `system-context-memory`. Anything that misses every probe lands in `misc-prompt-like`.");
  lines.push("");
  lines.push("## Caveats");
  lines.push("");
  lines.push("- The catalog is exhaustive for *literal* prompts above the length threshold that pass the filter. It does not capture prompts assembled at runtime from many short fragments.");
  lines.push("- `enclosing` is the closest named function in the AST (`FunctionDeclaration` / `VariableDeclarator` / `ObjectProperty` / `ClassMethod`). When a literal lives at module top level the entry is marked `top-level`.");
  lines.push("- Line numbers index into the regenerated `cli.renamed.js`. The byte offset (`0x\u2026`) is stable across reformatting.");
  lines.push("- Categories are heuristic. A prompt may legitimately belong to several categories; the rule order above picks one.");
  lines.push("- Template-literal interpolation sites are shown as `${\u2026}` rather than rendered \u2014 the runtime substitutes those at call time, so the body below is the static skeleton, not the rendered prompt sent to the model.");
  lines.push("");
  lines.push("## Related docs");
  lines.push("");
  lines.push("- [Prompt, context, and memory](prompt-context-memory.md)");
  lines.push("- [Prompt assembly scenarios](prompt-assembly-scenarios.md)");
  lines.push("- [Context, memory, compaction, checkpoints, and rewind](context-memory-compaction-checkpoints.md)");
  lines.push("- [Models, providers, and auth](models-providers-auth.md)");
  lines.push("- [Bundle module map (atlas)](../99-research-atlas/module-map-from-renamed-cli.md)");
  lines.push("");
  return lines.join("\n");
}

function renderShard(cat, prompts, out) {
  const cliRelPath = "../" + CLI_REL_FROM_PAGE; // shards live one directory deeper
  const lines = [];
  lines.push(`# Prompts — ${cat}`);
  lines.push("");
  lines.push(`${prompts.length} prompt${prompts.length === 1 ? "" : "s"} in this category.`);
  lines.push("");
  lines.push(CATEGORY_BLURB[cat]);
  lines.push("");
  lines.push(`Index: [Prompt template catalog](../prompt-template-catalog.md). Source: [\`cli.renamed.js\`](${cliRelPath}) (SHA-256 \`${out.input_sha256}\`).`);
  lines.push("");
  lines.push("Each entry shows the **full literal** as it appears in the bundle; `${\u2026}` marks template-literal interpolation sites that the runtime substitutes at call time.");
  lines.push("");
  lines.push("---");
  lines.push("");
  for (const p of prompts) {
    lines.push(renderPrompt(p, cliRelPath));
  }
  return lines.join("\n");
}

await main();
