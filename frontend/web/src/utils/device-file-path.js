export const DEVICE_FS_ROOT = "/";
export const DEVICE_FILES_DEFAULT_OPEN = "/storage/emulated/0";

/** @deprecated use DEVICE_FILES_DEFAULT_OPEN */
export const DEVICE_FILES_ROOT = DEVICE_FILES_DEFAULT_OPEN;

export function normalizeDevicePath(input) {
  const raw = String(input ?? "").trim() || DEVICE_FS_ROOT;
  const posix = raw.replace(/\\/g, "/");
  const parts = [];

  for (const segment of posix.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      parts.pop();
      continue;
    }

    parts.push(segment);
  }

  const joined = parts.length === 0 ? DEVICE_FS_ROOT : `/${parts.join("/")}`;

  if (joined === DEVICE_FS_ROOT) {
    return DEVICE_FS_ROOT;
  }

  return joined.replace(/\/+$/, "") || DEVICE_FS_ROOT;
}

export function resolveDevicePath(input) {
  const raw = String(input ?? "").trim();

  if (!raw || raw === DEVICE_FS_ROOT) {
    return normalizeDevicePath(DEVICE_FS_ROOT);
  }

  if (raw.startsWith("/")) {
    return normalizeDevicePath(raw);
  }

  return normalizeDevicePath(`/${raw}`);
}

export function joinDevicePath(parentPath, name) {
  const base = normalizeDevicePath(parentPath);
  const tail = String(name).replace(/\\/g, "/").replace(/^\/+/, "");

  if (!tail) {
    return base;
  }

  if (base === DEVICE_FS_ROOT) {
    return normalizeDevicePath(`${DEVICE_FS_ROOT}${tail}`);
  }

  return normalizeDevicePath(`${base}/${tail}`);
}
