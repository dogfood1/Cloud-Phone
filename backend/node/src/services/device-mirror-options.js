import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveAdbPath } from "./adb-path.js";
import { MIRROR_AUDIO_SOURCES } from "./mirror-audio-constants.js";

const execFileAsync = promisify(execFile);

async function runAdbShell(adbPath, serial, args, timeout = 8000) {
  const { stdout } = await execFileAsync(
    adbPath,
    ["-s", serial, "shell", ...args],
    { windowsHide: true, timeout, maxBuffer: 1024 * 1024 },
  );

  return stdout;
}

function parseDisplays(stdout) {
  const displays = [];
  const seen = new Set();

  for (const line of stdout.split(/\r?\n/)) {
    const match =
      line.match(/Display\s+(\d+)[^]*?(?:name|Name)=([^\s,]+)/i) ||
      line.match(/mDisplayId=(\d+)/);

    if (!match) {
      continue;
    }

    const id = match[1];
    const label = match[2] ? `屏幕 ${id} (${match[2]})` : `屏幕 ${id}`;

    if (!seen.has(id)) {
      seen.add(id);
      displays.push({ value: id, label });
    }
  }

  if (!displays.length) {
    displays.push({ value: "0", label: "默认屏幕 (0)" });
  }

  return displays;
}

function parsePackages(stdout) {
  const packages = [];

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed.startsWith("package:")) {
      continue;
    }

    const packageName = trimmed.replace(/^package:/, "");
    packages.push({
      value: packageName,
      label: packageName,
      packageName,
    });
  }

  return packages.slice(0, 500);
}

export async function getDeviceMirrorOptions(serial) {
  const adbPath = resolveAdbPath();
  let displays = [{ value: "0", label: "默认屏幕 (0)" }];
  let apps = [];

  try {
    const displayOutput = await runAdbShell(adbPath, serial, ["dumpsys", "display"]);
    displays = parseDisplays(displayOutput);
  } catch {
    displays = [{ value: "0", label: "默认屏幕 (0)" }];
  }

  try {
    const packagesOutput = await runAdbShell(adbPath, serial, [
      "pm",
      "list",
      "packages",
      "-3",
    ]);
    apps = parsePackages(packagesOutput);
  } catch {
    apps = [];
  }

  return {
    audioSources: MIRROR_AUDIO_SOURCES,
    displays,
    apps,
  };
}
