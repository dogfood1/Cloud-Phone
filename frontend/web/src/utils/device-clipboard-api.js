import { requestJson } from "./api.js";

export const MAX_DEVICE_CLIPBOARD_BYTES = 128 * 1024;

export function readDeviceClipboard(serial) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/clipboard`);
}

export function writeDeviceClipboard(serial, text) {
  return requestJson(`/api/devices/${encodeURIComponent(serial)}/clipboard`, {
    method: "POST",
    body: { text },
  });
}
