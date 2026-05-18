#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DIR = join(REPO_ROOT, "claude-code-pkg", "src", "entrypoints");
const DEFAULT_INPUT = join(DEFAULT_DIR, "cli.formatted.js");
const DEFAULT_OUTPUT = join(DEFAULT_DIR, "cli.renamed.js");
const DEFAULT_MAP = join(DEFAULT_DIR, "cli.renames.json");
const FORMATTER_MAX_BUFFER = 256 * 1024 * 1024;
const RESERVED_WORDS = new Set([
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

function usage() {
  return `Semantically rename high-confidence symbols in cli.formatted.js.

Usage:
  node scripts/semantic-rename-cli.mjs [options]

Defaults:
  input:  ./claude-code-pkg/src/entrypoints/cli.formatted.js
  output: ./claude-code-pkg/src/entrypoints/cli.renamed.js
  map:    ./claude-code-pkg/src/entrypoints/cli.renames.json

Options:
  --input <path>       Formatted bundle input
  --out <path>         Renamed JavaScript output
  --map <path>         Rename report JSON output
  --dry-run            Build the rename report without writing renamed JavaScript
  --no-format          Do not run Prettier on the renamed JavaScript output
  --help, -h           Show this help

Evidence used:
  - Export tables shaped like j$(module, { semanticName: () => obfuscatedName })
  - Error/class constructors that assign this.name = "SemanticErrorName"
  - String dispatch handlers shaped like if (kind === "semantic_action") return obfuscatedName(...)
  - String constants shaped like obfuscatedName = "semantic_value"
  - Call-path property aliases shaped like { semanticName: obfuscatedName } or obj.semanticName = obfuscatedName

Notes:
  - This does not recover original source names. It creates evidence-backed semantic aliases.
  - Renaming is scope-aware: only the binding and references resolved by Babel are changed.
  - Lower-confidence guesses from string anchors or call graph neighbors are intentionally not applied.
`;
}

function readValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    map: DEFAULT_MAP,
    dryRun: false,
    format: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--input") {
      options.input = resolve(readValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith("--input=")) {
      options.input = resolve(arg.slice("--input=".length));
    } else if (arg === "--out") {
      options.output = resolve(readValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith("--out=")) {
      options.output = resolve(arg.slice("--out=".length));
    } else if (arg === "--map") {
      options.map = resolve(readValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith("--map=")) {
      options.map = resolve(arg.slice("--map=".length));
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-format") {
      options.format = false;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function relativePath(filePath) {
  const rel = filePath.startsWith(REPO_ROOT + sep) ? filePath.slice(REPO_ROOT.length + 1) : filePath;
  return rel || filePath;
}

function runPrettier(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["--yes", "prettier@latest", "--ignore-path", "/dev/null", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: FORMATTER_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    const stdout = result.stdout ? `\n${result.stdout}` : "";
    throw new Error(`prettier exited with status ${result.status}${stderr}${stdout}`);
  }
}

function parseBundle(source) {
  return parse(source, {
    sourceType: "script",
    allowReturnOutsideFunction: true,
    plugins: ["explicitResourceManagement"],
  });
}

function isIdentifierName(name) {
  return /^[$A-Z_a-z][$\w]*$/.test(name) && !RESERVED_WORDS.has(name);
}

function sanitizeIdentifierName(name) {
  let sanitized = name.replace(/[^0-9A-Z_a-z$]+/g, "_");
  sanitized = sanitized.replace(/^_+|_+$/g, "");
  if (!sanitized) return undefined;
  if (/^[0-9]/.test(sanitized)) sanitized = `renamed_${sanitized}`;
  if (!isIdentifierName(sanitized)) return undefined;
  return sanitized;
}

function isMinifiedName(name) {
  return name.length <= 4 || /[$0-9]/.test(name);
}

function shouldUseSemanticName(name) {
  if (!name || name === "default") return false;
  if (!isIdentifierName(name)) return false;
  if (isMinifiedName(name)) return false;
  return true;
}

function bindingKey(binding) {
  return `${binding.scope.uid}:${binding.identifier.start}:${binding.identifier.name}`;
}

function keyName(node) {
  if (!node) return undefined;
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return sanitizeIdentifierName(node.value);
  return undefined;
}

function returnedIdentifierName(node) {
  if (!node) return undefined;
  if (node.type === "Identifier") return node.name;
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    if (node.body.type === "Identifier") return node.body.name;
    if (node.body.type === "BlockStatement" && node.body.body.length === 1) {
      const statement = node.body.body[0];
      if (statement.type === "ReturnStatement" && statement.argument?.type === "Identifier") {
        return statement.argument.name;
      }
    }
  }
  return undefined;
}

function isSemanticDispatchLiteral(value) {
  return /^[a-z][a-z0-9_]*(?:_[a-z0-9]+)+$/.test(value) && value.length >= 8;
}

function pascalCaseLiteral(value) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function camelCaseLiteral(value) {
  const pascal = pascalCaseLiteral(value);
  return pascal ? `${pascal[0].toLowerCase()}${pascal.slice(1)}` : undefined;
}

function handlerNameForDispatchLiteral(value) {
  if (!isSemanticDispatchLiteral(value)) return undefined;
  return `handle${pascalCaseLiteral(value)}`;
}

function stringLiteralValue(node) {
  return node?.type === "StringLiteral" ? node.value : undefined;
}

function dispatchLiteralFromTest(node) {
  if (!node || node.type !== "BinaryExpression") return undefined;
  if (node.operator !== "===" && node.operator !== "==") return undefined;

  const leftValue = stringLiteralValue(node.left);
  const rightValue = stringLiteralValue(node.right);
  if (leftValue && node.right.type === "Identifier") return leftValue;
  if (rightValue && node.left.type === "Identifier") return rightValue;
  return undefined;
}

function callCalleeIdentifierName(node) {
  if (!node) return undefined;
  const expression = node.type === "AwaitExpression" ? node.argument : node;
  if (expression.type !== "CallExpression") return undefined;
  return expression.callee.type === "Identifier" ? expression.callee.name : undefined;
}

function returnedCallCalleeIdentifierName(statement) {
  if (!statement) return undefined;
  if (statement.type === "ReturnStatement") return callCalleeIdentifierName(statement.argument);
  if (statement.type === "BlockStatement" && statement.body.length === 1) {
    return returnedCallCalleeIdentifierName(statement.body[0]);
  }
  return undefined;
}

function addCandidate(candidates, binding, proposedName, evidence) {
  const name = sanitizeIdentifierName(proposedName);
  if (!name || name === binding.identifier.name) return;
  if (!shouldUseSemanticName(name)) return;

  const key = bindingKey(binding);
  let entry = candidates.get(key);
  if (!entry) {
    entry = {
      binding,
      oldName: binding.identifier.name,
      candidates: new Map(),
    };
    candidates.set(key, entry);
  }

  const existing = entry.candidates.get(name) ?? { name, score: 0, evidence: [] };
  existing.score += evidence.score;
  existing.evidence.push({
    kind: evidence.kind,
    line: evidence.line,
    semanticName: proposedName,
  });
  entry.candidates.set(name, existing);
}

function collectExportTableCandidates(ast) {
  const candidates = new Map();

  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.type !== "Identifier" || path.node.callee.name !== "j$") return;
      const objectArg = path.node.arguments[1];
      if (!objectArg || objectArg.type !== "ObjectExpression") return;

      for (const property of objectArg.properties) {
        if (property.type !== "ObjectProperty") continue;
        const semanticName = keyName(property.key);
        const localName = returnedIdentifierName(property.value);
        if (!semanticName || !localName) continue;

        const binding = path.scope.getBinding(localName);
        if (!binding) continue;
        addCandidate(candidates, binding, semanticName, {
          kind: "export-table",
          line: property.loc?.start.line,
          score: 100,
        });
      }
    },
  });

  return candidates;
}

function findClassRuntimeName(classPath) {
  let runtimeName;
  classPath.traverse({
    AssignmentExpression(path) {
      if (runtimeName) return;
      const { left, right } = path.node;
      if (right.type !== "StringLiteral") return;
      if (left.type !== "MemberExpression") return;
      if (left.object.type !== "ThisExpression") return;
      const property = left.property;
      const isNameProperty = !left.computed
        ? property.type === "Identifier" && property.name === "name"
        : property.type === "StringLiteral" && property.value === "name";
      if (isNameProperty) runtimeName = right.value;
    },
  });
  return runtimeName;
}

function collectClassNameCandidates(ast) {
  const candidates = new Map();

  traverse(ast, {
    Class(path) {
      const semanticName = findClassRuntimeName(path);
      if (!semanticName) return;

      let binding;
      if (path.node.type === "ClassDeclaration" && path.node.id?.type === "Identifier") {
        binding = path.scope.getBinding(path.node.id.name);
      } else if (path.parentPath?.isVariableDeclarator() && path.parentPath.node.id.type === "Identifier") {
        binding = path.parentPath.scope.getBinding(path.parentPath.node.id.name);
      } else if (path.node.id?.type === "Identifier") {
        binding = path.scope.getBinding(path.node.id.name);
      }

      if (!binding) return;
      addCandidate(candidates, binding, semanticName, {
        kind: "runtime-class-name",
        line: path.node.loc?.start.line,
        score: 90,
      });
    },
  });

  return candidates;
}

function collectStringDispatchCandidates(ast) {
  const hitsByBinding = new Map();

  const addHit = (path, localName, literal, line) => {
    const proposedName = handlerNameForDispatchLiteral(literal);
    if (!proposedName) return;

    const binding = path.scope.getBinding(localName);
    if (!binding) return;

    const key = bindingKey(binding);
    let entry = hitsByBinding.get(key);
    if (!entry) {
      entry = { binding, proposedNames: new Map() };
      hitsByBinding.set(key, entry);
    }

    let proposed = entry.proposedNames.get(proposedName);
    if (!proposed) {
      proposed = { name: proposedName, lines: [] };
      entry.proposedNames.set(proposedName, proposed);
    }
    proposed.lines.push(line);
  };

  traverse(ast, {
    IfStatement(path) {
      const literal = dispatchLiteralFromTest(path.node.test);
      const localName = returnedCallCalleeIdentifierName(path.node.consequent);
      if (!literal || !localName) return;
      addHit(path, localName, literal, path.node.loc?.start.line);
    },
    SwitchStatement(path) {
      for (const switchCase of path.node.cases) {
        const literal = stringLiteralValue(switchCase.test);
        if (!literal) continue;
        for (const statement of switchCase.consequent) {
          const localName = returnedCallCalleeIdentifierName(statement);
          if (!localName) continue;
          addHit(path, localName, literal, statement.loc?.start.line);
          break;
        }
      }
    },
  });

  const candidates = new Map();
  for (const entry of hitsByBinding.values()) {
    if (entry.proposedNames.size !== 1) continue;
    const proposed = [...entry.proposedNames.values()][0];
    addCandidate(candidates, entry.binding, proposed.name, {
      kind: "string-dispatch-handler",
      line: proposed.lines[0],
      score: 70,
    });
  }

  return candidates;
}

function collectStringConstantCandidates(ast) {
  const candidates = new Map();

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.type !== "Identifier") return;
      if (!isMinifiedName(path.node.id.name)) return;
      if (path.node.init?.type !== "StringLiteral") return;
      if (!isSemanticDispatchLiteral(path.node.init.value)) return;

      const binding = path.scope.getBinding(path.node.id.name);
      if (!binding) return;
      addCandidate(candidates, binding, camelCaseLiteral(path.node.init.value), {
        kind: "string-literal-constant",
        line: path.node.loc?.start.line,
        score: 60,
      });
    },
  });

  return candidates;
}

const GENERIC_PROPERTY_KEYS = new Set([
  "value",
  "values",
  "type",
  "kind",
  "name",
  "id",
  "key",
  "data",
  "args",
  "arg",
  "options",
  "opts",
  "params",
  "param",
  "default",
  "ctx",
  "context",
  "fn",
  "cb",
  "callback",
  "handler",
  "method",
  "prop",
  "props",
  "children",
  "node",
  "nodes",
  "parent",
  "item",
  "items",
  "entry",
  "entries",
  "input",
  "output",
  "result",
  "results",
  "error",
  "Cache",
  "cache",
  "get",
  "set",
  "has",
  "add",
  "remove",
  "delete",
  "clear",
  "create",
  "update",
  "init",
  "exports",
  "current",
  "length",
  "size",
  "prototype",
  "constructor",
  "__esModule",
  "__proto__",
  "onCancel",
  "onChange",
  "onClick",
  "onSubmit",
  "onBlur",
  "onFocus",
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
  "onMouseDown",
  "onMouseUp",
  "onMouseEnter",
  "onMouseLeave",
  "onScroll",
  "onLoad",
  "onError",
  "onClose",
  "onOpen",
]);

function semanticPropertyKey(node) {
  if (!node) return undefined;
  let name;
  if (node.type === "Identifier") name = node.name;
  else if (node.type === "StringLiteral") name = node.value;
  if (!name) return undefined;
  if (!isIdentifierName(name)) return undefined;
  if (isMinifiedName(name)) return undefined;
  if (GENERIC_PROPERTY_KEYS.has(name)) return undefined;
  return name;
}

function collectPropertyAliasCandidates(ast) {
  const hitsByBinding = new Map();

  const record = (binding, kind, key, line) => {
    if (!binding || binding.kind === "param") return;
    const bindingId = bindingKey(binding);
    let entry = hitsByBinding.get(bindingId);
    if (!entry) {
      entry = { binding, keys: new Map() };
      hitsByBinding.set(bindingId, entry);
    }
    let keyEntry = entry.keys.get(key);
    if (!keyEntry) {
      keyEntry = { kinds: new Set(), count: 0, firstLine: line };
      entry.keys.set(key, keyEntry);
    }
    keyEntry.kinds.add(kind);
    keyEntry.count += 1;
  };

  traverse(ast, {
    ObjectExpression(path) {
      const parent = path.parentPath?.node;
      if (
        parent &&
        parent.type === "CallExpression" &&
        parent.callee.type === "Identifier" &&
        parent.callee.name === "j$"
      ) {
        return;
      }
      for (const property of path.node.properties) {
        if (property.type !== "ObjectProperty") continue;
        if (property.shorthand) continue;
        const key = semanticPropertyKey(property.key);
        if (!key) continue;
        const value = property.value;
        if (value?.type !== "Identifier" || !isMinifiedName(value.name)) continue;
        const binding = path.scope.getBinding(value.name);
        record(binding, "object-property", key, property.loc?.start.line);
      }
    },
    AssignmentExpression(path) {
      const { left, right } = path.node;
      if (right.type !== "Identifier" || !isMinifiedName(right.name)) return;
      if (left.type !== "MemberExpression" || left.computed) return;
      if (left.property.type !== "Identifier") return;
      const key = semanticPropertyKey(left.property);
      if (!key) return;
      const binding = path.scope.getBinding(right.name);
      record(binding, "member-assignment", key, path.node.loc?.start.line);
    },
  });

  const candidates = new Map();
  for (const entry of hitsByBinding.values()) {
    if (entry.keys.size !== 1) continue;
    const [keyName, keyEntry] = [...entry.keys.entries()][0];
    const allowObjectOnly = keyEntry.kinds.has("object-property") && !keyEntry.kinds.has("member-assignment");
    if (allowObjectOnly) {
      const bindingKindAllowed = entry.binding.kind === "hoisted" || entry.binding.kind === "var" || entry.binding.kind === "const";
      if (!bindingKindAllowed && keyEntry.count < 2) continue;
    }
    const score = keyEntry.kinds.has("member-assignment") ? 55 : 45;
    addCandidate(candidates, entry.binding, keyName, {
      kind: keyEntry.kinds.has("member-assignment") ? "member-assignment-alias" : "object-property-alias",
      line: keyEntry.firstLine,
      score,
    });
  }
  return candidates;
}

function mergeCandidateMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, entry] of map) {
      let target = merged.get(key);
      if (!target) {
        target = {
          binding: entry.binding,
          oldName: entry.oldName,
          candidates: new Map(),
        };
        merged.set(key, target);
      }
      for (const [name, candidate] of entry.candidates) {
        const existing = target.candidates.get(name) ?? { name, score: 0, evidence: [] };
        existing.score += candidate.score;
        existing.evidence.push(...candidate.evidence);
        target.candidates.set(name, existing);
      }
    }
  }
  return merged;
}

function bestCandidate(entry) {
  return [...entry.candidates.values()].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.name.length - left.name.length;
  })[0];
}

function makeUniqueName(baseName, binding, usedByScope) {
  const scope = binding.scope;
  let used = usedByScope.get(scope);
  if (!used) {
    used = new Set(Object.keys(scope.bindings));
    usedByScope.set(scope, used);
  }

  let index = 1;
  let candidate = baseName;
  while ((used.has(candidate) && candidate !== binding.identifier.name) || RESERVED_WORDS.has(candidate)) {
    index += 1;
    candidate = `${baseName}_${index}`;
  }
  used.delete(binding.identifier.name);
  used.add(candidate);
  return candidate;
}

function identifierNodesForBinding(binding) {
  const nodes = new Map();
  const add = (node) => {
    if (!node || node.type !== "Identifier" || node.name !== binding.identifier.name) return;
    if (typeof node.start !== "number" || typeof node.end !== "number") return;
    nodes.set(`${node.start}:${node.end}`, node);
  };

  add(binding.identifier);
  for (const referencePath of binding.referencePaths) add(referencePath.node);
  for (const violationPath of binding.constantViolations) {
    const node = violationPath.node;
    if (node.type === "AssignmentExpression") add(node.left);
    else if (node.type === "UpdateExpression") add(node.argument);
    else if (node.type === "ForInStatement" || node.type === "ForOfStatement") add(node.left);
  }

  return [...nodes.values()];
}

function hasUnsupportedShorthandReference(binding) {
  return binding.referencePaths.some((referencePath) => {
    const parent = referencePath.parentPath;
    return parent?.isObjectProperty() && parent.node.shorthand === true;
  });
}

function buildRenamePlan(candidateMap) {
  const usedByScope = new WeakMap();
  const plan = [];
  const skipped = [];

  for (const entry of candidateMap.values()) {
    const candidate = bestCandidate(entry);
    if (!candidate) continue;

    if (hasUnsupportedShorthandReference(entry.binding)) {
      skipped.push({
        oldName: entry.oldName,
        proposedName: candidate.name,
        reason: "object-shorthand-reference",
        evidence: candidate.evidence,
      });
      continue;
    }

    const newName = makeUniqueName(candidate.name, entry.binding, usedByScope);
    const nodes = identifierNodesForBinding(entry.binding);
    if (nodes.length === 0) {
      skipped.push({
        oldName: entry.oldName,
        proposedName: candidate.name,
        reason: "no-identifier-ranges",
        evidence: candidate.evidence,
      });
      continue;
    }

    plan.push({
      oldName: entry.oldName,
      newName,
      confidence: "high",
      score: candidate.score,
      evidence: candidate.evidence,
      referenceCount: entry.binding.referencePaths.length,
      writeCount: entry.binding.constantViolations.length,
      replacementCount: nodes.length,
      replacements: nodes.map((node) => ({ start: node.start, end: node.end, oldName: node.name, newName })),
    });
  }

  return { plan, skipped };
}

function applyReplacements(source, plan) {
  const replacements = plan
    .flatMap((rename) => rename.replacements)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  const chunks = [];
  let cursor = 0;
  for (const replacement of replacements) {
    if (replacement.start < cursor) {
      throw new Error(`Overlapping replacement around offset ${replacement.start}`);
    }
    const current = source.slice(replacement.start, replacement.end);
    if (current !== replacement.oldName) {
      throw new Error(`Replacement mismatch at ${replacement.start}: expected ${replacement.oldName}, found ${current}`);
    }
    chunks.push(source.slice(cursor, replacement.start), replacement.newName);
    cursor = replacement.end;
  }
  chunks.push(source.slice(cursor));

  return chunks.join("");
}

function reportForPlan(options, source, output, plan, skipped) {
  return {
    input: relativePath(options.input),
    output: options.dryRun ? null : relativePath(options.output),
    map: relativePath(options.map),
    generatedAt: new Date().toISOString(),
    sourceBytes: Buffer.byteLength(source),
    outputBytes: output ? Buffer.byteLength(output) : null,
    renameCount: plan.length,
    replacementCount: plan.reduce((sum, rename) => sum + rename.replacementCount, 0),
    skippedCount: skipped.length,
    renames: plan.map(({ replacements, ...rename }) => rename),
    skipped,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const source = await readFile(options.input, "utf8");
  const ast = parseBundle(source);
  const candidateMap = mergeCandidateMaps(
    collectExportTableCandidates(ast),
    collectClassNameCandidates(ast),
    collectStringDispatchCandidates(ast),
    collectStringConstantCandidates(ast),
    collectPropertyAliasCandidates(ast),
  );
  const { plan, skipped } = buildRenamePlan(candidateMap);
  const output = options.dryRun ? undefined : applyReplacements(source, plan);

  await mkdir(dirname(options.map), { recursive: true });
  await writeFile(options.map, `${JSON.stringify(reportForPlan(options, source, output, plan, skipped), null, 2)}\n`);

  if (!options.dryRun) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, output, "utf8");
    if (options.format) runPrettier(["--parser", "babel", "--write", options.output]);
  }

  console.error(
    JSON.stringify(
      {
        input: relativePath(options.input),
        output: options.dryRun ? null : relativePath(options.output),
        map: relativePath(options.map),
        renameCount: plan.length,
        replacementCount: plan.reduce((sum, rename) => sum + rename.replacementCount, 0),
        skippedCount: skipped.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`semantic-rename-cli: ${error.message}`);
  console.error(`\n${usage()}`);
  process.exitCode = 1;
});