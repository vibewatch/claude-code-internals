#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INPUT = join(REPO_ROOT, "claude-code-pkg", "src", "entrypoints", "cli.js");
const DEFAULT_OUTPUT = join(dirname(DEFAULT_INPUT), "cli.formatted.js");
const FORMATTER_MAX_BUFFER = 256 * 1024 * 1024;
const FORMATTER_PASSES = 2;

function usage() {
  return `Normalize the Claude Code cli.js artifact for reverse-engineering reads.

Usage:
  node scripts/normalize-cli-js.mjs [options]

Defaults:
  input:  ./claude-code-pkg/src/entrypoints/cli.js
  output: ./claude-code-pkg/src/entrypoints/cli.formatted.js

Options:
  --input <path>       Source cli.js path
  --out <path|->       Output path, or '-' for stdout
  --no-format          Write stitched/unescaped text without Prettier formatting
  --no-stitch          Preserve physical newlines outside strings/templates/comments
  --no-decode          Keep unicode/hex escapes unchanged
  --no-decode-hex      Keep \\xHH escapes unchanged while decoding \\u escapes
  --help, -h           Show this help

Notes:
  - This is a source-text normalizer, not a JavaScript parser or decompiler.
  - By default the normalized text is passed through Prettier to produce code blocks.
  - Newlines outside string/template/comment contexts are stitched into spaces.
  - Newlines inside template literals are preserved because they are string content.
  - Only safe printable \\uXXXX, \\u{X...}, and \\xHH escapes are decoded; escapes
    that would introduce quotes, backslashes, line terminators, or template hazards
    are left unchanged.
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
    format: true,
    stitch: true,
    decode: true,
    decodeHex: true,
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
      const value = readValue(argv, index, arg);
      options.output = value === "-" ? "-" : resolve(value);
      index += 1;
    } else if (arg.startsWith("--out=")) {
      const value = arg.slice("--out=".length);
      options.output = value === "-" ? "-" : resolve(value);
    } else if (arg === "--no-format") {
      options.format = false;
    } else if (arg === "--no-stitch") {
      options.stitch = false;
    } else if (arg === "--no-decode") {
      options.decode = false;
    } else if (arg === "--no-decode-hex") {
      options.decodeHex = false;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function relativePath(filePath) {
  if (filePath === "-") return "stdout";
  const rel = filePath.startsWith(REPO_ROOT + sep) ? filePath.slice(REPO_ROOT.length + 1) : filePath;
  return rel || filePath;
}

function runPrettier(args, options = {}) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["--yes", "prettier@latest", "--ignore-path", "/dev/null", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: FORMATTER_MAX_BUFFER,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    const stdout = result.stdout ? `\n${result.stdout}` : "";
    throw new Error(`prettier exited with status ${result.status}${stderr}${stdout}`);
  }

  return result;
}

function formatText(text) {
  let formatted = text;
  for (let pass = 0; pass < FORMATTER_PASSES; pass += 1) {
    formatted = runPrettier(["--parser", "babel"], { input: formatted }).stdout;
  }
  return formatted;
}

function formatFile(filePath) {
  for (let pass = 0; pass < FORMATTER_PASSES; pass += 1) {
    runPrettier(["--parser", "babel", "--write", filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
}

function isHex(text) {
  return /^[0-9a-fA-F]+$/.test(text);
}

function isHighSurrogate(value) {
  return value >= 0xd800 && value <= 0xdbff;
}

function isLowSurrogate(value) {
  return value >= 0xdc00 && value <= 0xdfff;
}

function combineSurrogates(high, low) {
  return 0x10000 + ((high - 0xd800) << 10) + (low - 0xdc00);
}

function isLineBreakChar(char) {
  return char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029";
}

function isUnsafeDecodedCharacter(char, state, source, nextIndex) {
  if (char.length === 0) return true;
  for (const part of char) {
    const codePoint = part.codePointAt(0);
    if (codePoint < 0x20 || codePoint === 0x7f || codePoint === 0xfeff) return true;
    if (part === "\\" || isLineBreakChar(part)) return true;
  }

  if (state === "single" && char === "'") return true;
  if (state === "double" && char === '"') return true;
  if (state === "template") {
    if (char === "`") return true;
    if (char === "$" && source[nextIndex] === "{") return true;
  }

  return false;
}

function decodeEscape(source, index, state, options, stats) {
  if (!options.decode || source[index] !== "\\") return undefined;

  const next = source[index + 1];
  if (next === "u") {
    if (source[index + 2] === "{") {
      const close = source.indexOf("}", index + 3);
      if (close === -1 || close - index > 12) return undefined;
      const hex = source.slice(index + 3, close);
      if (!hex || !isHex(hex)) return undefined;
      const codePoint = Number.parseInt(hex, 16);
      if (!Number.isSafeInteger(codePoint) || codePoint > 0x10ffff) return undefined;
      const text = String.fromCodePoint(codePoint);
      if (isUnsafeDecodedCharacter(text, state, source, close + 1)) return undefined;
      stats.decodedUnicode += 1;
      return { text, length: close - index + 1 };
    }

    const hex = source.slice(index + 2, index + 6);
    if (hex.length !== 4 || !isHex(hex)) return undefined;
    let codePoint = Number.parseInt(hex, 16);
    let length = 6;

    if (isHighSurrogate(codePoint) && source[index + 6] === "\\" && source[index + 7] === "u") {
      const lowHex = source.slice(index + 8, index + 12);
      if (lowHex.length === 4 && isHex(lowHex)) {
        const low = Number.parseInt(lowHex, 16);
        if (isLowSurrogate(low)) {
          codePoint = combineSurrogates(codePoint, low);
          length = 12;
        }
      }
    } else if (isLowSurrogate(codePoint)) {
      return undefined;
    }

    const text = String.fromCodePoint(codePoint);
    if (isUnsafeDecodedCharacter(text, state, source, index + length)) return undefined;
    stats.decodedUnicode += 1;
    return { text, length };
  }

  if (next === "x" && options.decodeHex) {
    const hex = source.slice(index + 2, index + 4);
    if (hex.length !== 2 || !isHex(hex)) return undefined;
    const text = String.fromCharCode(Number.parseInt(hex, 16));
    if (isUnsafeDecodedCharacter(text, state, source, index + 4)) return undefined;
    stats.decodedHex += 1;
    return { text, length: 4 };
  }

  return undefined;
}

function pushStitchedSpace(output) {
  const last = output.at(-1);
  if (last !== undefined && !/\s/.test(last)) {
    output.push(" ");
  }
}

function consumeLineBreak(source, index) {
  return source[index] === "\r" && source[index + 1] === "\n" ? 2 : 1;
}

function transform(source, options) {
  const output = [];
  const stats = {
    stitchedNewlines: 0,
    decodedUnicode: 0,
    decodedHex: 0,
  };

  let state = "normal";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === "normal") {
      if (char === "/" && next === "/") {
        output.push(char, next);
        index += 1;
        state = "lineComment";
      } else if (char === "/" && next === "*") {
        output.push(char, next);
        index += 1;
        state = "blockComment";
      } else if (char === "'") {
        output.push(char);
        state = "single";
      } else if (char === '"') {
        output.push(char);
        state = "double";
      } else if (char === "`") {
        output.push(char);
        state = "template";
      } else if (char === "\n" || char === "\r") {
        const consumed = consumeLineBreak(source, index);
        if (options.stitch) {
          pushStitchedSpace(output);
          stats.stitchedNewlines += 1;
        } else {
          output.push(char);
          if (consumed === 2) output.push(next);
        }
        index += consumed - 1;
      } else {
        output.push(char);
      }
      continue;
    }

    if (state === "lineComment") {
      if (char === "\n" || char === "\r") {
        const consumed = consumeLineBreak(source, index);
        output.push(consumed === 2 ? "\r\n" : char);
        index += consumed - 1;
        state = "normal";
      } else {
        const decoded = decodeEscape(source, index, state, options, stats);
        if (decoded) {
          output.push(decoded.text);
          index += decoded.length - 1;
        } else {
          output.push(char);
        }
      }
      continue;
    }

    if (state === "blockComment") {
      const decoded = decodeEscape(source, index, state, options, stats);
      if (decoded) {
        output.push(decoded.text);
        index += decoded.length - 1;
      } else if (char === "*" && next === "/") {
        output.push(char, next);
        index += 1;
        state = "normal";
      } else {
        output.push(char);
      }
      continue;
    }

    if (state === "single" || state === "double" || state === "template") {
      const quote = state === "single" ? "'" : state === "double" ? '"' : "`";
      if (char === "\\") {
        const decoded = decodeEscape(source, index, state, options, stats);
        if (decoded) {
          output.push(decoded.text);
          index += decoded.length - 1;
        } else {
          output.push(char);
          if (next !== undefined) {
            output.push(next);
            index += 1;
          }
        }
      } else if (char === quote) {
        output.push(char);
        state = "normal";
      } else {
        output.push(char);
      }
      continue;
    }
  }

  return { text: output.join(""), stats };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const source = await readFile(options.input, "utf8");
  const { text, stats } = transform(source, options);
  let outputText = text;

  if (options.output === "-") {
    if (options.format) {
      outputText = formatText(text);
    }
    process.stdout.write(outputText);
  } else {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, text, "utf8");
    if (options.format) {
      formatFile(options.output);
      outputText = await readFile(options.output, "utf8");
    }
  }

  const summary = {
    input: relativePath(options.input),
    output: relativePath(options.output),
    inputBytes: Buffer.byteLength(source),
    normalizedBytes: Buffer.byteLength(text),
    outputBytes: Buffer.byteLength(outputText),
    formatted: options.format,
    formatterPasses: options.format ? FORMATTER_PASSES : 0,
    ...stats,
  };
  console.error(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`normalize-cli-js: ${error.message}`);
  console.error(`\n${usage()}`);
  process.exitCode = 1;
});