import { fetchDeviceLauncherAppsResult } from "./device-launcher-apps-api.js";
import {
  getStoredLauncherFingerprint,
  loadCachedLauncherApps,
  saveLauncherAppsCache,
} from "./launcher-icon-browser-cache.js";

/**
 * Read IndexedDB only (no network).
 * @param {string} serial
 */
export async function readLauncherAppsBrowserCache(serial) {
  const key = String(serial || "").trim();
  if (!key) {
    return { apps: [], fingerprint: "", fromCache: false };
  }
  const cached = await loadCachedLauncherApps(key);
  if (!cached?.apps?.length) {
    return { apps: [], fingerprint: "", fromCache: false };
  }
  return {
    apps: cached.apps,
    fingerprint: cached.fingerprint || getStoredLauncherFingerprint(key),
    fromCache: true,
  };
}

/**
 * Fetch launcher apps from API and persist to browser cache.
 * @param {string} serial
 * @param {{ packageNamesOnly?: boolean, light?: boolean }} [options]
 */
export async function fetchAndCacheLauncherApps(serial, options = {}) {
  const key = String(serial || "").trim();
  const packageNamesOnly = Boolean(options.packageNamesOnly);
  if (!key) {
    return { apps: [], fingerprint: "", fromCache: false };
  }

  const result = await fetchDeviceLauncherAppsResult(key, {
    light: Boolean(options.light),
    packageNamesOnly,
  });
  const fingerprint = result.fingerprint || "";

  if (!packageNamesOnly && result.apps.length) {
    await saveLauncherAppsCache(key, fingerprint, result.apps);
  }

  return {
    apps: result.apps,
    fingerprint,
    fromCache: false,
  };
}

/**
 * Background refresh: skip rewrite when fingerprint unchanged and cache has icons.
 * @param {string} serial
 * @param {{ packageNamesOnly?: boolean, knownFingerprint?: string }} [options]
 */
export async function refreshLauncherAppsBrowserCache(serial, options = {}) {
  const key = String(serial || "").trim();
  if (!key || options.packageNamesOnly) {
    return { apps: [], fingerprint: "", changed: false, fromCache: false };
  }

  const localFp =
    String(options.knownFingerprint || "") || getStoredLauncherFingerprint(key);

  const result = await fetchDeviceLauncherAppsResult(key, { light: false });
  const remoteFp = result.fingerprint || "";

  if (localFp && remoteFp && localFp === remoteFp) {
    const cached = await loadCachedLauncherApps(key);
    const hasIcons = cached?.apps?.some((item) => item.iconDataUrl);
    if (cached?.apps?.length && hasIcons) {
      return {
        apps: cached.apps,
        fingerprint: remoteFp,
        changed: false,
        fromCache: true,
      };
    }
  }

  if (result.apps.length) {
    await saveLauncherAppsCache(key, remoteFp, result.apps);
  }

  return {
    apps: result.apps,
    fingerprint: remoteFp,
    changed: !localFp || !remoteFp || localFp !== remoteFp,
    fromCache: false,
  };
}

/**
 * After Icon Helper warm, fill IndexedDB so Start menu opens instantly.
 * @param {string} serial
 */
export async function prefetchLauncherAppsToBrowserCache(serial) {
  const key = String(serial || "").trim();
  if (!key) {
    return;
  }
  try {
    const cached = await loadCachedLauncherApps(key);
    const hasIcons = cached?.apps?.some((item) => item.iconDataUrl);
    if (cached?.apps?.length && hasIcons && getStoredLauncherFingerprint(key)) {
      return;
    }
    await refreshLauncherAppsBrowserCache(key);
  } catch {
    // warm must not throw into desktop
  }
}
