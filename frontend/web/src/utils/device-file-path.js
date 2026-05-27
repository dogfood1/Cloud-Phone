export const DEVICE_FILES_ROOT = "/storage/emulated/0";

export function toDisplayPath(devicePath) {
  const normalized = normalizeDevicePath(devicePath);

  if (normalized === DEVICE_FILES_ROOT) {
    return "/";
  }

  if (normalized.startsWith(`${DEVICE_FILES_ROOT}/`)) {
    return normalized.slice(DEVICE_FILES_ROOT.length);
  }

  return normalized;
}

export function fromDisplayPath(displayPath) {
  const raw = String(displayPath ?? "").trim() || "/";

  if (raw === "/" || raw === "") {
    return DEVICE_FILES_ROOT;
  }

  const relative = raw.startsWith("/") ? raw : `/${raw}`;
  return normalizeDevicePath(`${DEVICE_FILES_ROOT}${relative}`);
}

export function normalizeDevicePath(input) {
  const raw = String(input ?? "").trim() || DEVICE_FILES_ROOT;
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

  const joined = `/${parts.join("/")}`;

  if (joined === "/storage/emulated" || joined === "/storage") {
    return DEVICE_FILES_ROOT;
  }

  if (!joined.startsWith(DEVICE_FILES_ROOT)) {
    throw new Error("路径超出设备存储范围");
  }

  return joined === "/storage/emulated/0/" ? DEVICE_FILES_ROOT : joined.replace(/\/+$/, "") || DEVICE_FILES_ROOT;
}

export function joinDisplayPath(parentDisplayPath, name) {
  const base = parentDisplayPath === "/" ? "" : parentDisplayPath;
  return `${base}/${name}`.replace(/\/+/g, "/");
}
