import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "projects", "scrcpy");
const targetDir = path.join(rootDir, "backend", "source", "scrcpy");

const excludes = [".git", "build", ".gradle", "app\\build", "server\\build", "release"];

const args = [
  sourceDir,
  targetDir,
  "/E",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/nc",
  "/ns",
  "/np",
  ...excludes.flatMap((entry) => ["/XD", entry]),
];

const result = spawnSync("robocopy", args, { stdio: "inherit", shell: true });

if (result.status !== undefined && result.status < 8) {
  console.log("Synced scrcpy source to backend/source/scrcpy");
  console.log("Re-apply Cloud Phone patches in app/src/cloud_phone if needed.");
  process.exit(0);
}

process.exit(result.status ?? 1);
