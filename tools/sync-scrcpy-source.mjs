#!/usr/bin/env node
/** @deprecated Use tools/sync-scrcpy-from-upstream.mjs (cross-platform, preserves Cloud Phone overlays). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forwardScript = path.join(scriptDir, "sync-scrcpy-from-upstream.mjs");

const result = spawnSync(process.execPath, [forwardScript, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
