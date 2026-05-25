import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scrcpyRoot = path.join(rootDir, "backend", "source", "scrcpy");
const platformKey =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";
const binDir = path.join(rootDir, "backend", "bin", "scrcpy", platformKey);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? scrcpyRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

fs.mkdirSync(binDir, { recursive: true });

console.log(`Building scrcpy for ${platformKey}...`);

if (process.platform === "win32") {
  run("meson", ["setup", "build", "--buildtype=release", "-Dportable=true"]);
  run("ninja", ["-C", "build"]);
} else {
  run("./install_release.sh", []);
}

const buildOutput =
  process.platform === "win32"
    ? path.join(scrcpyRoot, "build", "app", "scrcpy.exe")
    : path.join(scrcpyRoot, "scrcpy");

const serverOutput =
  process.platform === "win32"
    ? path.join(scrcpyRoot, "build", "server", "scrcpy-server")
    : path.join(scrcpyRoot, "scrcpy-server");

const binaryName = process.platform === "win32" ? "scrcpy.exe" : "scrcpy";

fs.copyFileSync(buildOutput, path.join(binDir, binaryName));
fs.copyFileSync(serverOutput, path.join(binDir, "scrcpy-server"));

console.log(`Installed to ${binDir}`);
