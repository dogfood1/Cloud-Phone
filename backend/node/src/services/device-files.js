import { runAdb } from "./adb-command.js";
import { runWithAdbLock } from "./adb-lock.js";
import {
  DEVICE_FILES_ROOT,
  fromDisplayPath,
  getParentDevicePath,
  normalizeDevicePath,
  shellQuote,
  toDisplayPath,
} from "./device-file-path.js";

function parseLsLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("total")) {
    return null;
  }

  let working = trimmed;
  let linkTarget;

  const arrowIndex = working.indexOf(" -> ");

  if (arrowIndex !== -1) {
    linkTarget = working.slice(arrowIndex + 4).trim();
    working = working.slice(0, arrowIndex);
  }

  const parts = working.split(/\s+/);

  if (parts.length < 6) {
    return null;
  }

  const permissions = parts[0];
  const typeFlag = permissions[0];

  if (typeFlag !== "d" && typeFlag !== "-" && typeFlag !== "l") {
    return null;
  }

  let type = "file";

  if (typeFlag === "d") {
    type = "directory";
  } else if (typeFlag === "l") {
    type = "symlink";
  }

  const size = Number.parseInt(parts[4], 10);
  let nameStart = 6;

  if (parts[6] && /^\d{1,2}:\d{2}$/.test(parts[6])) {
    nameStart = 7;
  } else if (parts[7] && /^\d{1,2}:\d{2}$/.test(parts[7])) {
    nameStart = 8;
  }

  const name = parts.slice(nameStart).join(" ").trim();

  if (!name || name === "." || name === "..") {
    return null;
  }

  const modified = parts.slice(5, nameStart).join(" ");

  return {
    name,
    type,
    size: Number.isNaN(size) ? 0 : size,
    modified,
    permissions,
    linkTarget,
  };
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.type === "directory" && right.type !== "directory") {
      return -1;
    }

    if (left.type !== "directory" && right.type === "directory") {
      return 1;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
}

async function listDirectoryRaw(serial, devicePath) {
  const quoted = shellQuote(devicePath);
  const { stdout } = await runAdb(
    ["-s", serial, "shell", "ls", "-la", quoted],
    { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
  );

  const entries = [];

  for (const line of stdout.split(/\r?\n/)) {
    const parsed = parseLsLine(line);

    if (parsed) {
      entries.push(parsed);
    }
  }

  if (!entries.length) {
    const { stdout: namesOut } = await runAdb(
      ["-s", serial, "shell", "ls", "-1", quoted],
      { timeout: 15_000 },
    );

    for (const name of namesOut.split(/\r?\n/)) {
      const trimmed = name.trim();

      if (!trimmed || trimmed === "." || trimmed === "..") {
        continue;
      }

      entries.push({
        name: trimmed,
        type: "file",
        size: 0,
        modified: "",
        permissions: "",
      });
    }
  }

  return sortEntries(entries);
}

export async function listDeviceFiles(serial, requestedPath) {
  return runWithAdbLock(async () => {
    const devicePath = normalizeDevicePath(
      requestedPath ? fromDisplayPath(requestedPath) : DEVICE_FILES_ROOT,
    );
    const parentPath = getParentDevicePath(devicePath);
    const entries = await listDirectoryRaw(serial, devicePath);

    return {
      root: DEVICE_FILES_ROOT,
      path: devicePath,
      displayPath: toDisplayPath(devicePath),
      parentPath,
      parentDisplayPath: parentPath ? toDisplayPath(parentPath) : null,
      entries,
    };
  });
}
