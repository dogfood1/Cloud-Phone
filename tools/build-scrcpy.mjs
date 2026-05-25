import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { downloadScrcpyRelease } from "./download-scrcpy.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scrcpyRoot = path.join(rootDir, "backend", "source", "scrcpy");
const platformKey =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";
const binDir = path.join(rootDir, "backend", "bin", "scrcpy", platformKey);
const binaryName = process.platform === "win32" ? "scrcpy.exe" : "scrcpy";
const forceDownload = process.argv.includes("--download");
const serverOnly = process.argv.includes("--server-only");

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], {
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  return result.status === 0;
}

function canBuildFromSource() {
  if (process.platform === "win32") {
    return commandExists("meson") && commandExists("ninja");
  }

  return fs.existsSync(path.join(scrcpyRoot, "install_release.sh"));
}

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

function buildFromSource() {
  fs.mkdirSync(binDir, { recursive: true });
  console.log(`Building scrcpy for ${platformKey} from source...`);

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

  fs.copyFileSync(buildOutput, path.join(binDir, binaryName));
  fs.copyFileSync(serverOutput, path.join(binDir, "scrcpy-server"));
  console.log(`Installed to ${binDir}`);
}

async function main() {
  if (forceDownload || serverOnly || !canBuildFromSource()) {
    if (!forceDownload && !serverOnly && !canBuildFromSource()) {
      console.warn(
        "Meson/Ninja not found (or install_release.sh missing). Falling back to official prebuilt release.",
      );
      console.warn("To compile from source on Windows, install Meson + Ninja, then rerun without --download.");
    }

    await downloadScrcpyRelease({ serverOnly });
    return;
  }

  buildFromSource();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
