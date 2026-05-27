import { runAdb } from "./adb-command.js";
import { joinDevicePath, shellQuote } from "./device-file-path.js";
import { createListDirectoryError } from "./device-files-errors.js";

function parseLsLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("total")) {
    return null;
  }

  if (/^ls:\s/i.test(trimmed) || /permission denied/i.test(trimmed)) {
    throw new Error("权限不足，无法访问此目录");
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

  if (parts[6] && (/^\d{1,2}:\d{2}$/.test(parts[6]) || /^\d{4}-\d{2}-\d{2}$/.test(parts[6]))) {
    nameStart = 7;
  } else if (parts[7] && /^\d{1,2}:\d{2}$/.test(parts[7])) {
    nameStart = 8;
  } else if (parts[5] && /^\d{4}-\d{2}-\d{2}$/.test(parts[5]) && parts[6] && /^\d{1,2}:\d{2}$/.test(parts[6])) {
    nameStart = 7;
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

async function detectEntryTypes(serial, devicePath, names) {
  if (!names.length) {
    return new Map();
  }

  const script = names
    .map((name, index) => {
      const quoted = shellQuote(joinDevicePath(devicePath, name));
      return `[ -d ${quoted} ] && echo "d:${index}" || { [ -L ${quoted} ] && echo "l:${index}" || echo "f:${index}"; }`;
    })
    .join("; ");

  const { stdout } = await runAdb(["-s", serial, "shell", script], { timeout: 20_000 });
  const types = new Map();

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([dlf]):(\d+)$/);

    if (!match) {
      continue;
    }

    const name = names[Number(match[2])];

    if (!name) {
      continue;
    }

    types.set(name, match[1] === "d" ? "directory" : match[1] === "l" ? "symlink" : "file");
  }

  return types;
}

async function listNames(serial, devicePath) {
  const quoted = shellQuote(devicePath);

  try {
    const { stdout } = await runAdb(["-s", serial, "shell", "ls", "-1", quoted], { timeout: 15_000 });

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((name) => name && name !== "." && name !== "..");
  } catch (error) {
    throw createListDirectoryError(error, devicePath);
  }
}

export async function listDirectoryRaw(serial, devicePath) {
  const quoted = shellQuote(devicePath);
  let stdout = "";

  try {
    ({ stdout } = await runAdb(
      ["-s", serial, "shell", "ls", "-la", quoted],
      { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    throw createListDirectoryError(error, devicePath);
  }

  if (/permission denied/i.test(stdout)) {
    throw new Error("权限不足，无法访问此目录");
  }

  const entries = [];

  for (const line of stdout.split(/\r?\n/)) {
    const parsed = parseLsLine(line);

    if (parsed) {
      entries.push(parsed);
    }
  }

  if (entries.length) {
    return sortEntries(entries);
  }

  const names = await listNames(serial, devicePath);

  if (!names.length) {
    return [];
  }

  const types = await detectEntryTypes(serial, devicePath, names);

  return sortEntries(
    names.map((name) => ({
      name,
      type: types.get(name) ?? "file",
      size: 0,
      modified: "",
      permissions: "",
    })),
  );
}
