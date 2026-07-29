import { resolveIconHelperConsent } from "./icon-helper-consent.js";
import { fetchAndCacheInstalledApps } from "./device-apps-browser-resolve.js";
import {
  fetchAndCacheLauncherApps,
  refreshLauncherAppsBrowserCache,
} from "./launcher-apps-browser-resolve.js";

/**
 * Warm browser caches when a device comes online.
 *
 * 1) ADB path (never installs helper): package list + launcher activities
 * 2) Helper app path (consent ask/allow): labels + icons → overwrite cache
 *
 * @param {string} serial
 * @param {{
 *   prepareIconHelper?: (serial: string, opts?: object) => Promise<{ ok?: boolean, packageNamesOnly?: boolean }>,
 *   promptConsent?: boolean,
 * }} [options]
 */
export async function warmDeviceAppsBrowserCache(serial, options = {}) {
  const key = String(serial || "").trim();
  if (!key) {
    return { adbOk: false, helperOk: false };
  }

  let adbOk = false;
  try {
    await Promise.all([
      fetchAndCacheLauncherApps(key, { packageNamesOnly: true, light: true }),
      fetchAndCacheInstalledApps(key, { packageNamesOnly: true }),
    ]);
    adbOk = true;
  } catch {
    // ADB may flap during connect; caller can retry on next poll
  }

  const consent = resolveIconHelperConsent(key);
  if (consent === "denied") {
    return { adbOk, helperOk: false, packageNamesOnly: true };
  }

  // Without an explicit allow (or connect-time ask popup), keep ADB-only cache.
  if (consent !== "allowed" && options.promptConsent === false) {
    return { adbOk, helperOk: false, packageNamesOnly: true };
  }

  const prepare = options.prepareIconHelper;
  if (typeof prepare !== "function") {
    return { adbOk, helperOk: false, packageNamesOnly: consent !== "allowed" };
  }

  const prompt = options.promptConsent !== false && consent !== "allowed";
  try {
    const result = await prepare(key, {
      silent: !prompt,
      force: false,
    });
    if (result?.ok && !result.packageNamesOnly) {
      await refreshLauncherAppsBrowserCache(key);
      await fetchAndCacheInstalledApps(key, { packageNamesOnly: false });
      return { adbOk, helperOk: true, packageNamesOnly: false };
    }
    return {
      adbOk,
      helperOk: false,
      packageNamesOnly: Boolean(result?.packageNamesOnly ?? true),
    };
  } catch {
    return { adbOk, helperOk: false, packageNamesOnly: true };
  }
}
