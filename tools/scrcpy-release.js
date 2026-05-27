export const SCRCPY_RELEASE_VERSION = "4.0";

const RELEASE_BASE = `https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_RELEASE_VERSION}`;

export function getScrcpyReleaseAsset(platform = process.platform, arch = process.arch) {
  if (platform === "win32") {
    return arch === "x64"
      ? { fileName: `scrcpy-win64-v${SCRCPY_RELEASE_VERSION}.zip`, kind: "zip" }
      : { fileName: `scrcpy-win32-v${SCRCPY_RELEASE_VERSION}.zip`, kind: "zip" };
  }

  if (platform === "darwin") {
    return arch === "arm64"
      ? {
          fileName: `scrcpy-macos-aarch64-v${SCRCPY_RELEASE_VERSION}.tar.gz`,
          kind: "tar.gz",
        }
      : {
          fileName: `scrcpy-macos-x86_64-v${SCRCPY_RELEASE_VERSION}.tar.gz`,
          kind: "tar.gz",
        };
  }

  if (platform === "linux") {
    if (arch === "arm64" || arch === "aarch64") {
      return {
        fileName: `scrcpy-linux-aarch64-v${SCRCPY_RELEASE_VERSION}.tar.gz`,
        kind: "tar.gz",
      };
    }

    return {
      fileName: `scrcpy-linux-x86_64-v${SCRCPY_RELEASE_VERSION}.tar.gz`,
      kind: "tar.gz",
    };
  }

  return {
    fileName: `scrcpy-linux-x86_64-v${SCRCPY_RELEASE_VERSION}.tar.gz`,
    kind: "tar.gz",
  };
}

export function getScrcpyReleaseUrl(asset) {
  return `${RELEASE_BASE}/${asset.fileName}`;
}

export function getScrcpyServerOnlyUrl() {
  return `${RELEASE_BASE}/scrcpy-server-v${SCRCPY_RELEASE_VERSION}`;
}
