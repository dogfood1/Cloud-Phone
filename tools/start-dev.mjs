import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyProjectEnv } from "./env-loader.js";
import { waitForBackend } from "./wait-for-backend.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = applyProjectEnv();

function spawnDevProcess(childConfig) {
  return spawn(childConfig.command, childConfig.args, {
    cwd: childConfig.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

console.log("Starting Cloud Phone console...");
console.log(`Backend API: http://127.0.0.1:${config.backendPort}`);
console.log(`Frontend UI: http://127.0.0.1:${config.frontendPort}`);

const backendChild = spawnDevProcess({
  name: "backend",
  cwd: path.join(rootDir, "backend", "node"),
  command: "npm",
  args: ["run", "dev"],
});

backendChild.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`backend exited with code ${code}`);
  }
});

try {
  await waitForBackend(config.backendOrigin);
  console.log("Backend is ready. Starting frontend...");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const frontendChild = spawnDevProcess({
  name: "frontend",
  cwd: path.join(rootDir, "frontend", "web"),
  command: "npm",
  args: ["run", "dev"],
});

frontendChild.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`frontend exited with code ${code}`);
  }
});
