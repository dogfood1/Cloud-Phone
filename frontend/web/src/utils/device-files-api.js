import { DEVICE_FILES_DEFAULT_OPEN } from "./device-file-path.js";

export async function fetchDeviceFiles(serial, devicePath = DEVICE_FILES_DEFAULT_OPEN) {
  const params = new URLSearchParams({ path: devicePath });
  const url = `/api/devices/${encodeURIComponent(serial)}/files?${params}`;
  const response = await fetch(url, { credentials: "include" });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析设备目录响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "读取设备目录失败");
  }

  return payload;
}

export async function downloadDeviceFile(serial, devicePath, filenameHint) {
  const params = new URLSearchParams({ path: devicePath });
  const url = `/api/devices/${encodeURIComponent(serial)}/files/download?${params}`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    let message = "下载失败";

    try {
      const err = await response.json();
      message = err.message ?? message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const name =
    filenameHint ||
    devicePath.split("/").filter(Boolean).pop() ||
    "download";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function uploadDeviceFile(serial, devicePath, file) {
  const params = new URLSearchParams({ path: devicePath });
  const url = `/api/devices/${encodeURIComponent(serial)}/files/upload?${params}`;
  const response = await fetch(url, {
    method: "PUT",
    credentials: "include",
    body: file,
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("无法解析上传响应");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "上传失败");
  }

  return payload;
}
