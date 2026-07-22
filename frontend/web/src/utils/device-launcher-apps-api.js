import { requestJson } from "./api.js";

/**
 * @param {string} serial
 * @param {{ light?: boolean }} [options]
 */
export async function fetchDeviceLauncherApps(serial, options = {}) {
  const query = options.light ? "?light=1" : "";
  const result = await requestJson(
    `/api/devices/${encodeURIComponent(serial)}/launcher-apps${query}`,
  );
  return result.apps ?? [];
}
