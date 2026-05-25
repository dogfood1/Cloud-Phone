import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyProjectEnv } from "./env-loader.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = applyProjectEnv();

const children = [
  {
    name: "backend",
    cwd: path.join(rootDir, "backend", "node"),
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "frontend",
    cwd: path.join(rootDir, "frontend", "web"),
    command: "npm",
    args: ["run", "dev"],
  },
];

console.log("Starting Cloud Phone console...");
console.log(`Backend API: http://127.0.0.1:${config.backendPort}`);
console.log(`Frontend UI: http://127.0.0.1:${config.frontendPort}`);

for (const childConfig of children) {
  const child = spawn(childConfig.command, childConfig.args, {
    cwd: childConfig.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${childConfig.name} exited with code ${code}`);
    }
  });
}
