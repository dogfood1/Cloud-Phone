import { requestJson } from "./api.js";

/**
 * @param {string} serial
 */
export async function fetchDeviceQuickSettings(serial) {
  const result = await requestJson(`/api/devices/${encodeURIComponent(serial)}/quick-settings`);
  return result.settings ?? null;
}

/**
 * @param {string} serial
 * @param {Record<string, unknown>} patch
 */
export async function patchDeviceQuickSettings(serial, patch) {
  const result = await requestJson(`/api/devices/${encodeURIComponent(serial)}/quick-settings`, {
    method: "POST",
    body: patch,
  });
  return result.settings ?? null;
}
