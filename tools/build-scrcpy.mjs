import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildScrcpyClient } from "./build-scrcpy-client.mjs";
import { buildScrcpyServer } from "./build-scrcpy-server.mjs";
import { downloadScrcpyRelease } from "./download-scrcpy.mjs";
import { getHostPlatformKey, getScrcpyBinDir, getScrcpyServerPath } from "./scrcpy-platform.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scrcpyRoot = path.join(rootDir, "backend", "source", "scrcpy");
const forceDownload = process.argv.includes("--download");
const serverOnly = process.argv.includes("--server-only");
const allPlatforms =
  process.argv.includes("--all-platforms") || process.argv.includes("--all");

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], {
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  return result.status === 0;
}

function canBuildClientFromSource() {
  return commandExists("meson") && commandExists("ninja");
}

function buildFromSource() {
  const platformKey = getHostPlatformKey();
  console.log(`Building Cloud Phone scrcpy for ${platformKey} from source...`);

  const serverJar = buildScrcpyServer({ allPlatforms: allPlatforms });
  buildScrcpyClient(rootDir, scrcpyRoot, serverJar);
}

async function main() {
  if (serverOnly) {
    buildScrcpyServer({ allPlatforms: allPlatforms });
    return;
  }

  if (forceDownload) {
    console.warn(
      "[warn] --download 安装的是官方预编译包，scrcpy-server 不含 Cloud Phone WebSocket 魔改。",
    );
    console.warn("       Web 投屏请使用: node tools/build-scrcpy-server.mjs --all-platforms");
    await downloadScrcpyRelease({ serverOnly: false });
    return;
  }

  if (!canBuildClientFromSource()) {
    console.warn("未找到 meson 或 ninja，无法从源码编译桌面客户端。");
    console.warn("仅编译魔改 server（Web 投屏必需）...");

    if (!fs.existsSync(getScrcpyServerPath(rootDir, getHostPlatformKey()))) {
      buildScrcpyServer({ allPlatforms: allPlatforms });
    } else {
      console.log(`scrcpy-server 已存在: ${getScrcpyServerPath(rootDir, getHostPlatformKey())}`);
    }

    console.warn("可选: 安装 meson + ninja 后重新运行 node tools/build-scrcpy.mjs 以编译本机 scrcpy 客户端。");
    return;
  }

  buildFromSource();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
