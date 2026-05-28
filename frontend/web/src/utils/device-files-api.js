import { DEVICE_FILES_DEFAULT_OPEN } from "./device-file-path.js";
import { fetchEncryptedBinary, parseEncryptedFetchResponse, requestJson } from "./api.js";

export async function fetchDeviceFiles(serial, devicePath = DEVICE_FILES_DEFAULT_OPEN) {
  const params = new URLSearchParams({ path: devicePath });
  const result = await requestJson(
    `/api/devices/${encodeURIComponent(serial)}/files?${params}`,
  );
  return result;
}

export async function downloadDeviceFile(serial, devicePath, filenameHint) {
  const params = new URLSearchParams({ path: devicePath });
  const url = `/api/devices/${encodeURIComponent(serial)}/files/download?${params}`;
  const blob = await fetchEncryptedBinary(url);
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
  const payload = await parseEncryptedFetchResponse(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "上传失败");
  }

  return payload;
}
