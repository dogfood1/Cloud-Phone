import { runAdb } from "./adb-command.js";
import { installLocalApk, uninstallPackage } from "./device-apps-mutate.js";
import {
  ICON_HELPER_PACKAGE,
  resolveIconHelperBundle,
} from "./icon-helper-paths.js";

/**
 * @param {string} serial
 */
export async function getIconHelperStatus(serial) {
  const { bundledVersionCode } = resolveIconHelperBundle();
  const deviceVersionCode = await readDeviceVersionCode(serial);
  const installed = deviceVersionCode > 0;
  const needsUpdate = !installed || deviceVersionCode < bundledVersionCode;

  return {
    installed,
    deviceVersionCode: installed ? deviceVersionCode : null,
    bundledVersionCode,
    needsUpdate,
    packageName: ICON_HELPER_PACKAGE,
  };
}

/**
 * Ensure helper is installed at bundled versionCode (uninstall+reinstall when outdated).
 * @param {string} serial
 * @param {{ createExternalFilesDir?: boolean }} [options]
 */
export async function ensureIconHelperInstalled(serial, options = {}) {
  const { apkPath, bundledVersionCode } = resolveIconHelperBundle();
  const status = await getIconHelperStatus(serial);

  if (!status.needsUpdate) {
    if (options.createExternalFilesDir !== false) {
      await ensureExternalFilesDir(serial);
    }
    return { ...status, action: "noop" };
  }

  if (status.installed) {
    try {
      await uninstallPackage(serial, ICON_HELPER_PACKAGE);
    } catch {
      // continue to install even if uninstall reports failure
    }
  }

  await installLocalApk(serial, apkPath);
  if (options.createExternalFilesDir !== false) {
    await ensureExternalFilesDir(serial);
  }

  const after = await getIconHelperStatus(serial);
  return {
    ...after,
    action: status.installed ? "upgraded" : "installed",
    bundledVersionCode,
  };
}

/**
 * @param {string} serial
 * @returns {Promise<number>}
 */
async function readDeviceVersionCode(serial) {
  try {
    const pathCheck = await runAdb(
      ["-s", serial, "shell", "pm", "path", ICON_HELPER_PACKAGE],
      { timeout: 15_000 },
    );

    if (!String(pathCheck.stdout || "").includes("package:")) {
      return 0;
    }

    const { stdout } = await runAdb(
      ["-s", serial, "shell", "dumpsys", "package", ICON_HELPER_PACKAGE],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const match = String(stdout).match(/versionCode=(\d+)/);
    return match ? Number.parseInt(match[1], 10) || 1 : 1;
  } catch {
    return 0;
  }
}

/**
 * Launch BootstrapActivity once so Android/data/.../files exists.
 * @param {string} serial
 */
async function ensureExternalFilesDir(serial) {
  try {
    await runAdb(
      [
        "-s",
        serial,
        "shell",
        "am",
        "start",
        "-n",
        `${ICON_HELPER_PACKAGE}/.BootstrapActivity`,
      ],
      { timeout: 15_000 },
    );
  } catch {
    // ignore — extract may still create the dir
  }
}
