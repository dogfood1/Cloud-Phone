import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getScrcpyReleaseAsset,
  getScrcpyReleaseUrl,
  getScrcpyServerOnlyUrl,
  SCRCPY_RELEASE_VERSION,
} from "./scrcpy-release.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platformKey =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";
const binDir = path.join(rootDir, "backend", "bin", "scrcpy", platformKey);
const binaryName = process.platform === "win32" ? "scrcpy.exe" : "scrcpy";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function downloadToFile(url, destination) {
  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, buffer);
}

function extractArchive(archivePath, destinationDir, kind) {
  ensureDir(destinationDir);

  if (kind === "zip") {
    if (process.platform === "win32") {
      const command = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`;
      const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
        stdio: "inherit",
      });

      if (result.status !== 0) {
        throw new Error("Expand-Archive failed.");
      }

      return;
    }

    const unzip = spawnSync("unzip", ["-o", archivePath, "-d", destinationDir], {
      stdio: "inherit",
    });

    if (unzip.status !== 0) {
      throw new Error("unzip failed.");
    }

    return;
  }

  const tar = spawnSync("tar", ["-xzf", archivePath, "-C", destinationDir], {
    stdio: "inherit",
  });

  if (tar.status !== 0) {
    throw new Error("tar extract failed.");
  }
}

function walkFiles(dirPath, results = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, results);
      continue;
    }

    results.push(fullPath);
  }

  return results;
}

function findBundledFiles(extractRoot) {
  const files = walkFiles(extractRoot);
  const binaryPath = files.find((file) => path.basename(file) === binaryName);
  const serverPath = files.find((file) => path.basename(file) === "scrcpy-server");

  if (!serverPath) {
    throw new Error("scrcpy-server not found in release archive.");
  }

  return { binaryPath, serverPath };
}

function installFiles(binaryPath, serverPath) {
  ensureDir(binDir);
  fs.copyFileSync(serverPath, path.join(binDir, "scrcpy-server"));

  if (binaryPath) {
    const sourceDir = path.dirname(binaryPath);

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      if (!entry.isFile()) {
        continue;
      }

      const sourceFile = path.join(sourceDir, entry.name);
      const targetFile = path.join(binDir, entry.name);
      fs.copyFileSync(sourceFile, targetFile);
    }

    console.log(`Installed scrcpy desktop bundle from ${sourceDir}`);
  }
}

async function downloadServerOnly() {
  const serverPath = path.join(binDir, "scrcpy-server");
  ensureDir(binDir);
  console.warn(
    "[warn] 官方 scrcpy-server 不含 Cloud Phone WebSocket 魔改，Web 投屏请运行: node tools/build-scrcpy-server.mjs",
  );
  console.log(`Downloading scrcpy-server v${SCRCPY_RELEASE_VERSION}...`);
  await downloadToFile(getScrcpyServerOnlyUrl(), serverPath);
  console.log(`Installed scrcpy-server to ${serverPath}`);
}

export async function downloadScrcpyRelease(options = {}) {
  if (options.serverOnly) {
    await downloadServerOnly();
    return binDir;
  }

  const asset = getScrcpyReleaseAsset();
  const url = getScrcpyReleaseUrl(asset);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-phone-scrcpy-"));
  const archivePath = path.join(tempDir, asset.fileName);
  const extractRoot = path.join(tempDir, "extract");

  console.log(`Downloading ${asset.fileName}...`);
  console.log(url);

  await downloadToFile(url, archivePath);
  extractArchive(archivePath, extractRoot, asset.kind);

  const { binaryPath, serverPath } = findBundledFiles(extractRoot);
  installFiles(binaryPath, serverPath);

  console.log(`Installed scrcpy to ${binDir}`);

  return binDir;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const serverOnly = process.argv.includes("--server-only");

  downloadScrcpyRelease({ serverOnly }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
