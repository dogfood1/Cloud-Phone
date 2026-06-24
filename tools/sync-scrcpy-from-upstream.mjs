import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SKIP_DIRS,
  TARGET_DIR_SEGMENTS,
  UPSTREAM_DIR_SEGMENTS,
  WEBSOCKET_DEPENDENCY,
  shouldPreserve,
} from "./scrcpy-upstream-manifest.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstreamDir = path.join(rootDir, ...UPSTREAM_DIR_SEGMENTS);
const targetDir = path.join(rootDir, ...TARGET_DIR_SEGMENTS);

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

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureWebSocketDependency() {
  const buildGradlePath = path.join(targetDir, "server", "build.gradle");
  const original = fs.readFileSync(buildGradlePath, "utf8");

  if (original.includes("Java-WebSocket")) {
    return false;
  }

  const updated = original.replace(
    "dependencies {\n",
    `dependencies {\n    ${WEBSOCKET_DEPENDENCY}\n`,
  );

  fs.writeFileSync(buildGradlePath, updated, "utf8");
  return true;
}

export function syncScrcpyFromUpstream(options = {}) {
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(upstreamDir)) {
    throw new Error(
      `Missing upstream clone: ${upstreamDir}\n` +
        "Run: git clone --depth 1 --branch v4.0 https://github.com/Genymobile/scrcpy projects/scrcpy",
    );
  }

  let copied = 0;
  let preserved = 0;

  for (const relativePath of collectRelativeFiles(upstreamDir)) {
    if (shouldPreserve(relativePath)) {
      preserved += 1;
      continue;
    }

    const sourcePath = path.join(upstreamDir, relativePath);
    const destinationPath = path.join(targetDir, relativePath);

    if (!dryRun) {
      ensureParentDir(destinationPath);
      fs.copyFileSync(sourcePath, destinationPath);
    }

    copied += 1;
  }

  const patchedGradle = dryRun ? false : ensureWebSocketDependency();

  return {
    copied,
    preserved,
    patchedGradle,
    upstreamDir,
    targetDir,
  };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    const result = syncScrcpyFromUpstream({ dryRun });
    const mode = dryRun ? "[dry-run] " : "";

    console.log(`${mode}Synced scrcpy base files from projects/scrcpy -> backend/source/scrcpy`);
    console.log(`${mode}copied=${result.copied} preserved=${result.preserved}`);
    if (result.patchedGradle) {
      console.log("Re-applied Java-WebSocket dependency in server/build.gradle");
    }
    console.log("Cloud Phone overlays kept: ws/, cloud_phone/, Options/Controller patches.");
    console.log("Next: node tools/build-scrcpy-server.mjs --all-platforms");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
