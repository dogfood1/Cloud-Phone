import { parseEncryptedFetchResponse } from "./api.js";

export const MAX_DEVICE_PHOTO_BYTES = 50 * 1024 * 1024;
export const MAX_DEVICE_PHOTO_COUNT = 20;

export const DEVICE_PHOTO_ALBUM_OPTIONS = [
  { label: "Pictures", value: "pictures", path: "/storage/emulated/0/Pictures" },
  { label: "相机 (DCIM/Camera)", value: "camera", path: "/storage/emulated/0/DCIM/Camera" },
];

export async function uploadDevicePhoto(serial, album, file) {
  const params = new URLSearchParams({ album, filename: file.name });
  const url = `/api/devices/${encodeURIComponent(serial)}/photos/upload?${params}`;
  const response = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: file.type ? { "Content-Type": file.type } : {},
    body: file,
  });
  const payload = await parseEncryptedFetchResponse(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? payload.error ?? "照片上传失败");
  }

  return payload;
}
