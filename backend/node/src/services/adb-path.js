import { fileURLToPath } from "node:url";
import path from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const projectRootPath = path.resolve(currentDirPath, "..", "..", "..", "..");

const ADB_EXECUTABLES = {
  win32: ["backend", "bin", "adb", "platform-tools-latest-windows", "platform-tools", "adb.exe"],
  linux: ["backend", "bin", "adb", "platform-tools-latest-linux", "platform-tools", "adb"],
  darwin: ["backend", "bin", "adb", "platform-tools-latest-darwin", "platform-tools", "adb"],
};

export function resolveAdbPath() {
  const adbSegments = ADB_EXECUTABLES[process.platform];

  if (!adbSegments) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  return path.resolve(projectRootPath, ...adbSegments);
}
