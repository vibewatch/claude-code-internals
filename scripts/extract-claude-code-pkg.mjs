#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { arch as osArch, tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WRAPPER_PACKAGE = "@anthropic-ai/claude-code";
const NATIVE_PACKAGE_PREFIX = "@anthropic-ai/claude-code";
const DEFAULT_OUT_DIR = join(REPO_ROOT, "claude-code-pkg");

const SUPPORTED_PLATFORMS = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "linux-arm64",
  "linux-x64-musl",
  "linux-arm64-musl",
  "win32-x64",
  "win32-arm64",
]);

function usage() {
  return `Download the Claude Code npm wrapper plus native runtime package.

Usage:
  node scripts/extract-claude-code-pkg.mjs [options]

Options:
  --platform <target>          Native package target. Defaults to this host.
                               Supported: ${[...SUPPORTED_PLATFORMS].join(", ")}
  --arch <x64|arm64>           Convenience shortcut for linux-<arch> on glibc.
  --version <version|latest>   Claude Code package version/tag (default: latest)
  --out <dir>                  Output directory (default: ./claude-code-pkg)
  --keep-wrapper-tgz <path>    Also copy the wrapper package tarball there
  --keep-native-tgz <path>     Also copy the native package tarball there
  --no-bun-section             Do not dump the ELF .bun section when present
  -h, --help                   Show this help

Examples:
  node scripts/extract-claude-code-pkg.mjs
  node scripts/extract-claude-code-pkg.mjs --platform linux-arm64
  node scripts/extract-claude-code-pkg.mjs --version 2.1.143 --out claude-code-pkg
`;
}

function detectMusl() {
  if (process.platform !== "linux") {
    return false;
  }

  const report =
    typeof process.report?.getReport === "function"
      ? process.report.getReport()
      : undefined;
  return report?.header?.glibcVersionRuntime === undefined;
}

function inferDefaultPlatform() {
  let cpu = osArch();

  if (process.platform === "linux") {
    if (cpu !== "x64" && cpu !== "arm64") {
      cpu = "x64";
    }
    return `linux-${cpu}${detectMusl() ? "-musl" : ""}`;
  }

  if (process.platform === "darwin") {
    if (cpu !== "x64" && cpu !== "arm64") {
      cpu = "arm64";
    }
    return `darwin-${cpu}`;
  }

  if (process.platform === "win32") {
    if (cpu !== "x64" && cpu !== "arm64") {
      cpu = "x64";
    }
    return `win32-${cpu}`;
  }

  return "linux-x64";
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
    platform: inferDefaultPlatform(),
    version: "latest",
    outDir: DEFAULT_OUT_DIR,
    keepWrapperTgz: undefined,
    keepNativeTgz: undefined,
    dumpBunSection: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--platform") {
      options.platform = readValue(argv, i, arg);
      i += 1;
    } else if (arg.startsWith("--platform=")) {
      options.platform = arg.slice("--platform=".length);
    } else if (arg === "--arch") {
      options.platform = `linux-${readValue(argv, i, arg)}`;
      i += 1;
    } else if (arg.startsWith("--arch=")) {
      options.platform = `linux-${arg.slice("--arch=".length)}`;
    } else if (arg === "--version") {
      options.version = readValue(argv, i, arg);
      i += 1;
    } else if (arg.startsWith("--version=")) {
      options.version = arg.slice("--version=".length);
    } else if (arg === "--out") {
      options.outDir = resolve(readValue(argv, i, arg));
      i += 1;
    } else if (arg.startsWith("--out=")) {
      options.outDir = resolve(arg.slice("--out=".length));
    } else if (arg === "--keep-wrapper-tgz") {
      options.keepWrapperTgz = resolve(readValue(argv, i, arg));
      i += 1;
    } else if (arg.startsWith("--keep-wrapper-tgz=")) {
      options.keepWrapperTgz = resolve(arg.slice("--keep-wrapper-tgz=".length));
    } else if (arg === "--keep-native-tgz") {
      options.keepNativeTgz = resolve(readValue(argv, i, arg));
      i += 1;
    } else if (arg.startsWith("--keep-native-tgz=")) {
      options.keepNativeTgz = resolve(arg.slice("--keep-native-tgz=".length));
    } else if (arg === "--no-bun-section") {
      options.dumpBunSection = false;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!SUPPORTED_PLATFORMS.has(options.platform)) {
    throw new Error(`Unsupported platform: ${options.platform}`);
  }

  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const rendered = [
      `$ ${command} ${args.join(" ")}`,
      result.stdout?.trim(),
      result.stderr?.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    throw new Error(rendered);
  }

  return result;
}

function nativePackageName(platform) {
  return `${NATIVE_PACKAGE_PREFIX}-${platform}`;
}

function nativeBinaryName(platform) {
  return platform.startsWith("win32-") ? "claude.exe" : "claude";
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function packPackage(spec, tempDir) {
  console.log(`Packing ${spec} ...`);

  const result = run("npm", [
    "pack",
    spec,
    "--pack-destination",
    tempDir,
    "--json",
  ]);

  let info;
  try {
    const parsed = JSON.parse(result.stdout.trim());
    info = Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse npm pack output for ${spec}: ${error.message}\n${result.stdout}`,
    );
  }

  const filename = info.filename ?? basename(info.path ?? "");
  if (!filename) {
    throw new Error(`npm pack did not report a tarball filename for ${spec}`);
  }

  const tarball = resolve(tempDir, filename);
  await stat(tarball);

  return {
    packageName: info.name ?? spec.split("@").slice(0, -1).join("@"),
    requestedSpec: spec,
    resolvedVersion: info.version,
    tarball,
    filename,
    integrity: info.integrity,
    shasum: info.shasum,
  };
}

function tarEntries(tarball) {
  return run("tar", ["-tzf", tarball]).stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function assertSafePackageTar(entries) {
  if (entries.length === 0) {
    throw new Error("npm tarball is empty");
  }

  for (const entry of entries) {
    const normalized = entry.replaceAll("\\", "/");
    const parts = normalized.split("/").filter(Boolean);

    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      parts.includes("..")
    ) {
      throw new Error(`Refusing unsafe tar entry: ${entry}`);
    }

    if (!normalized.startsWith("package/")) {
      throw new Error(`Expected npm tar entry to start with package/: ${entry}`);
    }
  }
}

async function unpackPackage(packageInfo, outDir, expectedName) {
  const entries = tarEntries(packageInfo.tarball);
  assertSafePackageTar(entries);
  await mkdir(outDir, { recursive: true });

  run("tar", [
    "-xzf",
    packageInfo.tarball,
    "-C",
    outDir,
    "--strip-components=1",
  ]);

  const packageJson = await readJson(join(outDir, "package.json"));
  if (packageJson.name !== expectedName) {
    throw new Error(
      `Extracted package is ${packageJson.name ?? "unknown"}, expected ${expectedName}`,
    );
  }

  return packageJson;
}

function readCString(buffer, offset) {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end += 1;
  }
  return buffer.toString("utf8", offset, end);
}

function detectBinaryFormat(buffer) {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return "elf";
  }
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return "pe";
  }
  if (buffer.length >= 4) {
    const be = buffer.readUInt32BE(0);
    const le = buffer.readUInt32LE(0);
    if (
      be === 0xfeedface ||
      be === 0xfeedfacf ||
      be === 0xcafebabe ||
      le === 0xfeedface ||
      le === 0xfeedfacf
    ) {
      return "macho";
    }
  }
  return "unknown";
}

function extractElfSection(buffer, sectionName) {
  if (detectBinaryFormat(buffer) !== "elf") {
    return undefined;
  }
  if (buffer[4] !== 2 || buffer[5] !== 1) {
    throw new Error("Only ELF64 little-endian binaries are supported for section dumping");
  }

  const sectionHeaderOffset = Number(buffer.readBigUInt64LE(0x28));
  const sectionHeaderEntrySize = buffer.readUInt16LE(0x3a);
  const sectionHeaderCount = buffer.readUInt16LE(0x3c);
  const sectionNameStringIndex = buffer.readUInt16LE(0x3e);

  if (sectionHeaderCount === 0 || sectionNameStringIndex >= sectionHeaderCount) {
    throw new Error("ELF section table is missing or malformed");
  }

  const sectionAt = (index) => {
    const offset = sectionHeaderOffset + index * sectionHeaderEntrySize;
    if (offset + 64 > buffer.length) {
      throw new Error("ELF section header overruns file");
    }
    return {
      nameOffset: buffer.readUInt32LE(offset),
      type: buffer.readUInt32LE(offset + 4),
      flags: buffer.readBigUInt64LE(offset + 8).toString(),
      address: buffer.readBigUInt64LE(offset + 16).toString(),
      offset: Number(buffer.readBigUInt64LE(offset + 24)),
      size: Number(buffer.readBigUInt64LE(offset + 32)),
    };
  };

  const shstr = sectionAt(sectionNameStringIndex);
  const shstrBytes = buffer.subarray(shstr.offset, shstr.offset + shstr.size);

  for (let i = 0; i < sectionHeaderCount; i += 1) {
    const section = sectionAt(i);
    const name = readCString(shstrBytes, section.nameOffset);
    if (name !== sectionName) {
      continue;
    }
    if (section.offset + section.size > buffer.length) {
      throw new Error(`ELF section ${sectionName} overruns file`);
    }
    return {
      name,
      type: section.type,
      flags: section.flags,
      address: section.address,
      offset: section.offset,
      size: section.size,
      buffer: buffer.subarray(section.offset, section.offset + section.size),
    };
  }

  return undefined;
}

async function hashFile(filePath) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function relativePath(filePath) {
  const rel = relative(process.cwd(), filePath);
  return rel && !rel.startsWith("..") && !rel.startsWith(sep) ? rel : filePath;
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function maybeCopyFile(source, destination) {
  if (!destination) {
    return;
  }

  await ensureParentDir(destination);
  await copyFile(source, destination);
}

function assertSafeOutDir(outDir) {
  const resolved = resolve(outDir);
  const parsedRoot = resolve(sep);

  if (resolved === parsedRoot) {
    throw new Error("Refusing to extract into filesystem root");
  }

  if (resolved === REPO_ROOT) {
    throw new Error("Refusing to replace the repository root");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  assertSafeOutDir(options.outDir);

  const tempDir = await mkdtemp(join(tmpdir(), "claude-code-pack-"));
  const outParent = dirname(options.outDir);
  const outBase = basename(options.outDir);
  await mkdir(outParent, { recursive: true });
  const staging = await mkdtemp(join(outParent, `.${outBase}.extract-`));

  try {
    const wrapperInfo = await packPackage(`${WRAPPER_PACKAGE}@${options.version}`, tempDir);
    const wrapperDir = join(staging, "wrapper");
    const wrapperPackageJson = await unpackPackage(wrapperInfo, wrapperDir, WRAPPER_PACKAGE);

    const nativeName = nativePackageName(options.platform);
    const nativeVersion = wrapperPackageJson.optionalDependencies?.[nativeName]
      ?? wrapperInfo.resolvedVersion
      ?? options.version;
    const nativeInfo = await packPackage(`${nativeName}@${nativeVersion}`, tempDir);
    const nativeDir = join(staging, "native");
    const nativePackageJson = await unpackPackage(nativeInfo, nativeDir, nativeName);

    await maybeCopyFile(wrapperInfo.tarball, options.keepWrapperTgz);
    await maybeCopyFile(nativeInfo.tarball, options.keepNativeTgz);

    const binaryName = nativeBinaryName(options.platform);
    const binaryPath = join(nativeDir, binaryName);
    const binaryRelativePath = relative(staging, binaryPath);
    const binary = await readFile(binaryPath);
    const binaryFormat = detectBinaryFormat(binary);
    const binaryStat = await stat(binaryPath);
    const binarySha256 = await hashFile(binaryPath);

    let bunSection;
    if (options.dumpBunSection && binaryFormat === "elf") {
      const section = extractElfSection(binary, ".bun");
      if (section) {
        const sectionPath = join(staging, "sections", "claude.bun");
        await mkdir(dirname(sectionPath), { recursive: true });
        await writeFile(sectionPath, section.buffer);
        const sectionRelativePath = relative(staging, sectionPath);
        bunSection = {
          name: section.name,
          offset: section.offset,
          offsetHex: `0x${section.offset.toString(16)}`,
          size: section.size,
          sha256: sha256Buffer(section.buffer),
          path: join(options.outDir, sectionRelativePath),
          relativePath: sectionRelativePath,
        };
      }
    }

    const metadata = {
      generatedAt: new Date().toISOString(),
      targetPlatform: options.platform,
      wrapperPackage: {
        name: wrapperPackageJson.name,
        version: wrapperPackageJson.version,
        requestedSpec: wrapperInfo.requestedSpec,
        filename: wrapperInfo.filename,
        integrity: wrapperInfo.integrity,
        shasum: wrapperInfo.shasum,
        bin: wrapperPackageJson.bin,
      },
      nativePackage: {
        name: nativePackageJson.name,
        version: nativePackageJson.version,
        requestedSpec: nativeInfo.requestedSpec,
        filename: nativeInfo.filename,
        integrity: nativeInfo.integrity,
        shasum: nativeInfo.shasum,
      },
      binary: {
        path: join(options.outDir, binaryRelativePath),
        relativePath: binaryRelativePath,
        name: binaryName,
        format: binaryFormat,
        bytes: binaryStat.size,
        sha256: binarySha256,
      },
      bunSection: bunSection ?? null,
      notes: [
        "Claude Code is distributed as a small npm wrapper plus platform-specific native packages.",
        "Current Linux builds are Bun standalone ELF executables with a large .bun payload section.",
        "The .bun dump is useful for string-surface indexing; it is not a readable source map by itself.",
      ],
    };

    await writeFile(join(staging, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

    await rm(options.outDir, { recursive: true, force: true });
    await rename(staging, options.outDir);

    console.log("");
    console.log(`Wrapper package: ${metadata.wrapperPackage.name}@${metadata.wrapperPackage.version}`);
    console.log(`Native package: ${metadata.nativePackage.name}@${metadata.nativePackage.version}`);
    console.log(`Binary: ${metadata.binary.format}, ${formatBytes(metadata.binary.bytes)}, sha256=${metadata.binary.sha256}`);
    if (metadata.bunSection) {
      console.log(
        `.bun section: ${formatBytes(metadata.bunSection.size)} at ${metadata.bunSection.offsetHex}, sha256=${metadata.bunSection.sha256}`,
      );
    } else {
      console.log(".bun section: not dumped or not present");
    }
    console.log(`Output: ${relativePath(options.outDir)}`);

    if (options.keepWrapperTgz) {
      console.log(`Kept wrapper tarball: ${relativePath(options.keepWrapperTgz)}`);
    }
    if (options.keepNativeTgz) {
      console.log(`Kept native tarball: ${relativePath(options.keepNativeTgz)}`);
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {});
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`extract-claude-code-pkg: ${error.message}`);
  console.error(`\n${usage()}`);
  process.exit(1);
});