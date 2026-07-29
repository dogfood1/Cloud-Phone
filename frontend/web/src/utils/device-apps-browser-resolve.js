import { fetchDeviceApps } from "./device-apps-api.js";
import {
  getStoredInstalledAppsFingerprint,
  loadCachedInstalledApps,
  saveInstalledAppsCache,
} from "./device-apps-browser-cache.js";
import { loadCachedLauncherApps } from "./launcher-icon-browser-cache.js";

/**
 * @param {string} serial
 */
export async function readInstalledAppsBrowserCache(serial) {
  const key = String(serial || "").trim();
  if (!key) {
    return { apps: [], fingerprint: "", fromCache: false };
  }
  const cached = await loadCachedInstalledApps(key);
  if (!cached?.apps?.length) {
    return { apps: [], fingerprint: "", fromCache: false };
  }
  return {
    apps: cached.apps,
    fingerprint: cached.fingerprint || getStoredInstalledAppsFingerprint(key),
    fromCache: true,
  };
}

/**
 * Merge Start-menu icon dataUrls onto installed-app rows by packageName.
 * @param {Array<Record<string, unknown>>} apps
 * @param {string} serial
 */
async function mergeLauncherIcons(apps, serial) {
  const launcher = await loadCachedLauncherApps(serial);
  if (!launcher?.apps?.length) {
    return apps;
  }
  const icons = new Map();
  for (const row of launcher.apps) {
    const pkg = String(row.packageName || "");
    if (pkg && row.iconDataUrl) {
      icons.set(pkg, row.iconDataUrl);
    }
  }
  if (!icons.size) {
    return apps;
  }
  return apps.map((row) => {
    const icon = icons.get(String(row.packageName || ""));
    return icon ? { ...row, iconDataUrl: icon } : row;
  });
}

/**
 * Fetch installed apps via ADB API and write browser cache.
 * @param {string} serial
 * @param {{ packageNamesOnly?: boolean }} [options]
 */
export async function fetchAndCacheInstalledApps(serial, options = {}) {
  const key = String(serial || "").trim();
  if (!key) {
    return { apps: [], fingerprint: "", fromCache: false };
  }
  const rows = await fetchDeviceApps(key);
  const namesOnly = Boolean(options.packageNamesOnly);
  const previous = namesOnly ? await loadCachedInstalledApps(key) : null;
  const prevByPkg = new Map(
    (previous?.apps || []).map((row) => [String(row.packageName || ""), row]),
  );

  let apps = rows.map((row) => {
    const pkg = String(row.packageName || "");
    if (!namesOnly) {
      return { ...row };
    }
    const old = prevByPkg.get(pkg);
    // Keep previously cached labels/icons when doing a names-only soft refresh.
    const keepLabel =
      old?.label && String(old.label) !== pkg ? String(old.label) : pkg;
    return {
      ...row,
      label: keepLabel,
      iconDataUrl: old?.iconDataUrl || null,
    };
  });
  apps = await mergeLauncherIcons(apps, key);
  const fingerprint = `apps:${apps.length}:${apps.filter((a) => a.iconDataUrl).length}`;
  if (apps.length) {
    await saveInstalledAppsCache(key, fingerprint, apps);
  }
  return { apps, fingerprint, fromCache: false };
}
