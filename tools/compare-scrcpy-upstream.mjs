import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import {
  PRESERVE_FILES,
  PRESERVE_PREFIXES,
  SKIP_DIRS,
  TARGET_DIR_SEGMENTS,
  UPSTREAM_DIR_SEGMENTS,
} from "./scrcpy-upstream-manifest.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstreamDir = path.join(rootDir, ...UPSTREAM_DIR_SEGMENTS);
const targetDir = path.join(rootDir, ...TARGET_DIR_SEGMENTS);

function sha256(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function shouldSkip(relativePath) {
  if (PRESERVE_FILES.has(relativePath)) {
    return true;
  }

  return PRESERVE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function collectRelativeFiles(root) {
  const files = [];

  function inner(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }

        inner(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(path.relative(root, absolutePath).replaceAll("\\", "/"));
      }
    }
  }

  inner(root);
  return files;
}

function main() {
  if (!fs.existsSync(upstreamDir)) {
    console.error(`Missing upstream clone: ${upstreamDir}`);
    console.error(
      "Run: git clone --depth 1 --branch v4.0 https://github.com/Genymobile/scrcpy projects/scrcpy",
    );
    process.exit(1);
  }

  const upstreamFiles = new Set(collectRelativeFiles(upstreamDir));
  const targetFiles = new Set(collectRelativeFiles(targetDir));

  const missing = [];
  const drift = [];
  const onlyTarget = [];

  for (const relativePath of upstreamFiles) {
    if (shouldSkip(relativePath)) {
      continue;
    }

    const upstreamPath = path.join(upstreamDir, relativePath);
    const targetPath = path.join(targetDir, relativePath);

    if (!fs.existsSync(targetPath)) {
      missing.push(relativePath);
      continue;
    }

    if (sha256(upstreamPath) !== sha256(targetPath)) {
      drift.push(relativePath);
    }
  }

  for (const relativePath of targetFiles) {
    if (shouldSkip(relativePath)) {
      continue;
    }

    if (!upstreamFiles.has(relativePath)) {
      onlyTarget.push(relativePath);
    }
  }

  console.log(`upstream: ${upstreamDir}`);
  console.log(`target:   ${targetDir}`);
  console.log(`missing_in_target: ${missing.length}`);
  missing.slice(0, 20).forEach((item) => console.log(`  + ${item}`));
  console.log(`drift: ${drift.length}`);
  drift.slice(0, 20).forEach((item) => console.log(`  ~ ${item}`));
  console.log(`only_in_target: ${onlyTarget.length}`);
  onlyTarget.slice(0, 20).forEach((item) => console.log(`  b ${item}`));

  if (missing.length === 0 && drift.length === 0) {
    console.log("Base scrcpy sources are aligned with upstream (excluding Cloud Phone overlays).");
  }
}

main();
