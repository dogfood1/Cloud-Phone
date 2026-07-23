import { requestJson } from "./api.js";

/**
 * @param {string} serial
 * @param {{ light?: boolean, packageNamesOnly?: boolean }} [options]
 * @returns {Promise<{ apps: Array<Record<string, unknown>>, fingerprint: string }>}
 */
export async function fetchDeviceLauncherAppsResult(serial, options = {}) {
  const params = new URLSearchParams();
  if (options.light) {
    params.set("light", "1");
  }
  if (options.packageNamesOnly) {
    params.set("packageNamesOnly", "1");
  }
  const query = params.toString() ? `?${params}` : "";
  const result = await requestJson(
    `/api/devices/${encodeURIComponent(serial)}/launcher-apps${query}`,
  );
  return {
    apps: Array.isArray(result.apps) ? result.apps : [],
    fingerprint: String(result.fingerprint || ""),
  };
}

/**
 * @param {string} serial
 * @param {{ light?: boolean, packageNamesOnly?: boolean }} [options]
 */
export async function fetchDeviceLauncherApps(serial, options = {}) {
  const result = await fetchDeviceLauncherAppsResult(serial, options);
  return result.apps;
}
