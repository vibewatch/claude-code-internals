#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PKG_DIR = join(REPO_ROOT, "claude-code-pkg");
const FINAL_ROOT_FILES = [
  "src/entrypoints/cli.js",
  "image-processor.js",
  "audio-capture.js",
  "image-processor.node",
  "audio-capture.node",
];
const FINAL_ROOT_FILE_SET = new Set(FINAL_ROOT_FILES);
const UNWANTED_FINAL_OUTPUTS = [
  "metadata.json",
  "bun-standalone-graph",
  "jsc-bytecode-dump",
  "prompt-catalog",
];
const TRAILER = Buffer.from("\n---- Bun! ----\n");
const OFFSETS_SIZE = 32;
const MODULE_RECORD_SIZE = 52;

function usage() {
  return `Extract the final Claude Code reverse-engineering artifacts.

Usage:
  node scripts/extract-claude-code-final-artifacts.mjs [options]

Outputs:
  ./claude-code-pkg/src/entrypoints/cli.js
  ./claude-code-pkg/image-processor.js
  ./claude-code-pkg/audio-capture.js
  ./claude-code-pkg/image-processor.node
  ./claude-code-pkg/audio-capture.node

Options:
  --pkg-dir <dir>             Claude package directory (default: ./claude-code-pkg)
  --refresh-package           Re-download wrapper/native packages before extraction
  --version <version|latest>  Package version/tag for --refresh-package (default: latest)
  --platform <target>         Native package target for --refresh-package
  --no-clean                  Do not remove old generated output directories/files first
  --keep-inputs               Keep wrapper/native/sections after generating final artifacts
  -h, --help                  Show this help

Notes:
  - If required package files are missing, the package extractor is run automatically.
  - The Bun graph is parsed in memory and is not kept.
  - Metadata, jsc-bytecode-dump, prompt-catalog, and bun-standalone-graph are pruned.
  - Native .node addons are extracted alongside their JS shims; .gitignore keeps them out of git.
  - By default, wrapper/native/sections are treated as temporary inputs and pruned.
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
    pkgDir: DEFAULT_PKG_DIR,
    refreshPackage: false,
    version: "latest",
    platform: undefined,
    clean: true,
    keepInputs: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--pkg-dir") {
      options.pkgDir = resolve(readValue(argv, i, arg));
      i += 1;
    } else if (arg.startsWith("--pkg-dir=")) {
      options.pkgDir = resolve(arg.slice("--pkg-dir=".length));
    } else if (arg === "--refresh-package") {
      options.refreshPackage = true;
    } else if (arg === "--version") {
      options.version = readValue(argv, i, arg);
      i += 1;
    } else if (arg.startsWith("--version=")) {
      options.version = arg.slice("--version=".length);
    } else if (arg === "--platform") {
      options.platform = readValue(argv, i, arg);
      i += 1;
    } else if (arg.startsWith("--platform=")) {
      options.platform = arg.slice("--platform=".length);
    } else if (arg === "--no-clean") {
      options.clean = false;
    } else if (arg === "--keep-inputs") {
      options.keepInputs = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function relativePath(filePath) {
  const rel = relative(REPO_ROOT, filePath);
  return rel && !rel.startsWith("..") && !rel.startsWith(sep) ? rel : filePath;
}

function runNode(scriptRelativePath, args) {
  const scriptPath = join(REPO_ROOT, scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${scriptRelativePath} exited with status ${result.status}`);
  }
}

async function exists(filePath) {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function assertSafeTargetDir(pkgDir, targetDir) {
  const resolvedPkg = resolve(pkgDir);
  const resolvedTarget = resolve(targetDir);
  if (resolvedTarget === resolve(sep) || resolvedTarget === REPO_ROOT || resolvedTarget === resolvedPkg) {
    throw new Error(`Refusing to clean unsafe directory: ${resolvedTarget}`);
  }
  if (!resolvedTarget.startsWith(`${resolvedPkg}${sep}`)) {
    throw new Error(`Refusing to clean outside package dir: ${resolvedTarget}`);
  }
}

function assertSafePackageChild(pkgDir, targetPath) {
  const resolvedPkg = resolve(pkgDir);
  const resolvedTarget = resolve(targetPath);
  if (resolvedTarget === resolve(sep) || resolvedTarget === REPO_ROOT || resolvedTarget === resolvedPkg) {
    throw new Error(`Refusing unsafe package-root cleanup target: ${resolvedTarget}`);
  }
  if (!resolvedTarget.startsWith(`${resolvedPkg}${sep}`)) {
    throw new Error(`Refusing to clean outside package dir: ${resolvedTarget}`);
  }
}

async function cleanUnwantedFinalOutputs(pkgDir) {
  for (const relativeOutput of UNWANTED_FINAL_OUTPUTS) {
    const target = join(pkgDir, relativeOutput);
    assertSafePackageChild(pkgDir, target);
    await rm(target, { recursive: true, force: true });
  }
}

async function pruneInputDirs(pkgDir) {
  const inputDirs = [join(pkgDir, "wrapper"), join(pkgDir, "native"), join(pkgDir, "sections")];
  const pruned = [];
  for (const inputDir of inputDirs) {
    assertSafeTargetDir(pkgDir, inputDir);
    if (await exists(inputDir)) {
      await rm(inputDir, { recursive: true, force: true });
      pruned.push(inputDir);
    }
  }
  return pruned;
}

async function packageLooksReady(pkgDir) {
  return exists(join(pkgDir, "sections", "claude.bun"));
}

async function maybeExtractPackage(options) {
  if (!options.refreshPackage && (await packageLooksReady(options.pkgDir))) {
    return;
  }

  const args = ["--out", options.pkgDir, "--version", options.version];
  if (options.platform) {
    args.push("--platform", options.platform);
  }
  runNode("scripts/extract-claude-code-pkg.mjs", args);
}

function readU64LE(buffer, offset, label) {
  const value = buffer.readBigUInt64LE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} is too large for JavaScript's safe integer range: ${value}`);
  }
  return Number(value);
}

function pointerAt(buffer, offset) {
  return {
    offset: buffer.readUInt32LE(offset),
    length: buffer.readUInt32LE(offset + 4),
  };
}

function assertPointer(buffer, pointer, label) {
  if (pointer.offset + pointer.length > buffer.length) {
    throw new Error(`${label} pointer overruns payload: offset=${pointer.offset}, length=${pointer.length}`);
  }
}

function sliceFor(buffer, pointer, label) {
  assertPointer(buffer, pointer, label);
  return buffer.subarray(pointer.offset, pointer.offset + pointer.length);
}

function stringFor(buffer, pointer, label) {
  return sliceFor(buffer, pointer, label).toString("utf8");
}

function normalizeBunPayload(sectionBuffer) {
  if (sectionBuffer.length < TRAILER.length + OFFSETS_SIZE) {
    throw new Error("Input is too small to contain a Bun StandaloneModuleGraph payload");
  }

  let payload = sectionBuffer;
  if (sectionBuffer.length >= 8) {
    const candidateLengthBig = sectionBuffer.readBigUInt64LE(0);
    if (candidateLengthBig <= BigInt(sectionBuffer.length - 8)) {
      const candidateLength = Number(candidateLengthBig);
      const candidateEnd = 8 + candidateLength;
      if (
        candidateEnd >= TRAILER.length &&
        sectionBuffer.subarray(candidateEnd - TRAILER.length, candidateEnd).equals(TRAILER)
      ) {
        payload = sectionBuffer.subarray(8, candidateEnd);
      }
    }
  }

  if (!payload.subarray(payload.length - TRAILER.length).equals(TRAILER)) {
    throw new Error("Could not find Bun StandaloneModuleGraph trailer at the end of the payload");
  }

  return payload;
}

function safeModulePath(name, index) {
  let normalized = name.replaceAll("\\", "/");
  normalized = normalized.replace(/^\/\$bunfs\//, "");
  normalized = normalized.replace(/^B:\/~BUN\//i, "");
  normalized = normalized.replace(/^\/+/, "");

  if (!normalized) {
    normalized = `module-${index}`;
  }

  const parts = normalized
    .split("/")
    .filter((part) => part && part !== ".")
    .map((part) => part.replace(/[<>:"|?*\x00-\x1f]/g, "_"));

  if (parts.length === 0 || parts.some((part) => part === ".." || /^[A-Za-z]:$/.test(part))) {
    throw new Error(`Unsafe module path after normalization: ${name}`);
  }

  return parts.join("/");
}

function finalRootRelativePath(name, index) {
  const safePath = safeModulePath(name, index);
  const rootPrefix = "root/";
  if (!safePath.startsWith(rootPrefix)) return undefined;
  const stripped = safePath.slice(rootPrefix.length);
  return FINAL_ROOT_FILE_SET.has(stripped) ? stripped : undefined;
}

async function writeFinalRootFile(pkgDir, relativeOutput, bytes) {
  const destination = join(pkgDir, relativeOutput);
  assertSafePackageChild(pkgDir, destination);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return destination;
}

async function extractRootContents(pkgDir, bunSectionPath) {
  const payload = normalizeBunPayload(await readFile(bunSectionPath));
  const offsetsOffset = payload.length - TRAILER.length - OFFSETS_SIZE;
  if (offsetsOffset < 0) {
    throw new Error("Payload is too small to contain offsets and trailer");
  }

  const byteCount = readU64LE(payload, offsetsOffset, "StandaloneModuleGraph byte_count");
  if (byteCount > offsetsOffset) {
    throw new Error(`StandaloneModuleGraph byte_count exceeds serialized byte region: ${byteCount} > ${offsetsOffset}`);
  }

  const modulesPtr = pointerAt(payload, offsetsOffset + 8);
  const modulesBytes = sliceFor(payload, modulesPtr, "modules list");
  if (modulesBytes.length % MODULE_RECORD_SIZE !== 0) {
    throw new Error(`Module record blob length ${modulesBytes.length} is not divisible by ${MODULE_RECORD_SIZE}`);
  }

  const written = [];
  const moduleCount = modulesBytes.length / MODULE_RECORD_SIZE;
  for (let index = 0; index < moduleCount; index += 1) {
    const recordOffset = modulesPtr.offset + index * MODULE_RECORD_SIZE;
    const name = stringFor(payload, pointerAt(payload, recordOffset), `module[${index}].name`);
    const relativeOutput = finalRootRelativePath(name, index);
    if (!relativeOutput) continue;

    const contents = sliceFor(payload, pointerAt(payload, recordOffset + 8), `module[${index}].contents`);
    written.push(await writeFinalRootFile(pkgDir, relativeOutput, contents));
  }

  return written;
}

async function existingFinalOutputs(pkgDir) {
  const outputs = [];
  for (const relativeOutput of FINAL_ROOT_FILES) {
    const output = join(pkgDir, relativeOutput);
    if (await exists(output)) {
      outputs.push(output);
    }
  }
  return outputs;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  await mkdir(options.pkgDir, { recursive: true });
  await maybeExtractPackage(options);

  const bunSectionPath = join(options.pkgDir, "sections", "claude.bun");

  if (!(await exists(bunSectionPath))) {
    throw new Error(`Missing .bun section dump: ${relativePath(bunSectionPath)}`);
  }
  if (options.clean) {
    await cleanUnwantedFinalOutputs(options.pkgDir);
  }
  await extractRootContents(options.pkgDir, bunSectionPath);
  await cleanUnwantedFinalOutputs(options.pkgDir);

  const outputs = await existingFinalOutputs(options.pkgDir);
  const cliPath = join(options.pkgDir, "src", "entrypoints", "cli.js");
  if (!(await exists(cliPath))) {
    throw new Error(`Extraction did not produce expected cli.js: ${relativePath(cliPath)}`);
  }

  const prunedInputs = options.keepInputs ? [] : await pruneInputDirs(options.pkgDir);

  console.log("\nFinal artifacts:");
  for (const output of outputs) {
    const info = await stat(output);
    console.log(`- ${relativePath(output)}${info.isDirectory() ? "/" : ""}`);
  }
  if (prunedInputs.length > 0) {
    console.log("\nPruned temporary inputs:");
    for (const inputDir of prunedInputs) {
      console.log(`- ${relativePath(inputDir)}/`);
    }
  }
}

main().catch((error) => {
  console.error(`extract-claude-code-final-artifacts: ${error.message}`);
  console.error(`\n${usage()}`);
  process.exitCode = 1;
});