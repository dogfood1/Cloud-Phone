import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import { fetchScrcpyAppLabel } from "./device-apps-scrcpy-labels.js";
import { isPackageDisabledForUser } from "./device-apps-list.js";

/**
 * @param {string} serial
 * @param {string} packageName
 */
export async function getPackageDetail(serial, packageName) {
  return runWithAdbLock(async () => {
    const { stdout } = await runAdb(["-s", serial, "shell", "dumpsys", "package", packageName], {
      timeout: 45_000,
      maxBuffer: 12 * 1024 * 1024,
    });

    if (!stdout || stdout.includes("Unable to find package") || stdout.length < 50) {
      const err = new Error("未找到该应用或无法读取包信息。");
      err.code = "package_not_found";
      throw err;
    }

    const disabledForUser = await isPackageDisabledForUser(serial, packageName);

    const detail = parseDumpsysPackage(stdout, packageName, disabledForUser);

    if (!detail.label || detail.label === packageName) {
      const scrcpyLabel = await fetchScrcpyAppLabel(serial, packageName).catch(() => "");

      if (scrcpyLabel) {
        detail.label = scrcpyLabel;
      }
    }

    return detail;
  });
}

/**
 * @param {string} text
 * @param {string} packageName
 * @param {boolean} disabledForUser
 */
function parseDumpsysPackage(text, packageName, disabledForUser) {
  const versionName = text.match(/versionName=([^\s\r\n]+)/)?.[1]?.trim() ?? "";
  const versionCode = text.match(/versionCode=(\d+)/)?.[1]?.trim() ?? "";
  const targetSdkVersion = text.match(/targetSdkVersion=(\d+)/)?.[1]?.trim() ?? "";
  const minSdkVersion = text.match(/minSdkVersion=(\d+)/)?.[1]?.trim() ?? "";
  const firstInstallTime = text.match(/firstInstallTime=(\d+)/)?.[1]?.trim() ?? "";
  const lastUpdateTime = text.match(/lastUpdateTime=(\d+)/)?.[1]?.trim() ?? "";

  let label = "";

  const labelMatch = text.match(/applicationInfo[^\n]*labelRes=\S+\s+nonLocalizedLabel=([^\s]+)/);

  if (labelMatch) {
    label = stripQuotes(labelMatch[1]);
  }

  if (!label) {
    const appLabel = text.match(/android:label=([^\s]+)/);

    if (appLabel) {
      label = stripQuotes(appLabel[1]);
    }
  }

  const dataDirMatch = text.match(/dataDir=([^\s]+)/);
  const codePathMatch = text.match(/codePath=([^\s]+)/);

  return {
    packageName,
    label: label || packageName,
    versionName,
    versionCode,
    targetSdkVersion,
    minSdkVersion,
    firstInstallTime,
    lastUpdateTime,
    dataDir: dataDirMatch ? stripQuotes(dataDirMatch[1]) : "",
    codePath: codePathMatch ? stripQuotes(codePathMatch[1]) : "",
    enabled: !disabledForUser,
    disabledForUser,
  };
}

function stripQuotes(s) {
  const t = String(s).trim();

  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }

  return t;
}
