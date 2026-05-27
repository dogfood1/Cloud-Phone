import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { getHostPlatformKey, getScrcpyBinDir, getScrcpyBinaryName } from "./scrcpy-platform.js";

/**
 * @param {string} scrcpyRoot
 * @param {string} command
 * @param {string[]} args
 */
function run(scrcpyRoot, command, args) {
  const result = spawnSync(command, args, {
    cwd: scrcpyRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

/**
 * @param {string} scrcpyRoot
 * @param {string} serverJarPath absolute path to modded scrcpy-server
 */
function mesonSetup(scrcpyRoot, serverJarPath) {
  const buildDir = "build";
  const setupArgs = [
    "setup",
    buildDir,
    "--buildtype=release",
    process.platform === "win32" ? "-Dportable=true" : "--strip",
    `-Dprebuilt_server=${serverJarPath}`,
    "-Dcompile_server=false",
  ];

  if (process.platform !== "win32") {
    setupArgs.push("-Dportable=true");
  }

  run(scrcpyRoot, "meson", setupArgs);
  return buildDir;
}

/**
 * @param {string} rootDir repo root
 * @param {string} scrcpyRoot backend/source/scrcpy
 * @param {string} serverJarPath modded scrcpy-server for current host platform bin dir
 */
export function buildScrcpyClient(rootDir, scrcpyRoot, serverJarPath) {
  const platformKey = getHostPlatformKey();
  const binDir = getScrcpyBinDir(rootDir, platformKey);
  const binaryName = getScrcpyBinaryName(platformKey);

  if (!fs.existsSync(serverJarPath)) {
    throw new Error(`Modded scrcpy-server missing. Run: node tools/build-scrcpy-server.mjs\n  ${serverJarPath}`);
  }

  fs.mkdirSync(binDir, { recursive: true });

  const buildDir = mesonSetup(scrcpyRoot, path.resolve(serverJarPath));
  run(scrcpyRoot, "ninja", ["-C", buildDir]);

  const clientOutput =
    process.platform === "win32"
      ? path.join(scrcpyRoot, buildDir, "app", "scrcpy.exe")
      : path.join(scrcpyRoot, buildDir, "app", "scrcpy");

  if (!fs.existsSync(clientOutput)) {
    throw new Error(`scrcpy client binary not found after build: ${clientOutput}`);
  }

  fs.copyFileSync(clientOutput, path.join(binDir, binaryName));
  fs.copyFileSync(serverJarPath, path.join(binDir, "scrcpy-server"));

  console.log(`Installed scrcpy client (${platformKey}) -> ${path.join(binDir, binaryName)}`);
  console.log(`Synced scrcpy-server -> ${path.join(binDir, "scrcpy-server")}`);

  return binDir;
}
