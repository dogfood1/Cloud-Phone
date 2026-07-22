/** @type {Map<string, string | null>} */
const iconCache = new Map();
/** @type {Set<string>} */
const iconLoading = new Set();

/**
 * @param {string} serial
 * @param {string} packageName
 */
export function getCachedAppIcon(serial, packageName) {
  return iconCache.get(iconCacheKey(serial, packageName)) ?? null;
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @param {string | null} iconDataUrl
 */
export function setCachedAppIcon(serial, packageName, iconDataUrl) {
  iconCache.set(iconCacheKey(serial, packageName), iconDataUrl);
}

/**
 * @param {string} serial
 * @param {string} packageName
 */
export function hasCachedAppIcon(serial, packageName) {
  return iconCache.has(iconCacheKey(serial, packageName));
}

/**
 * Load icons that were already extracted by Icon Helper (cache only).
 * Full APK pull extraction has been removed in favor of the helper service.
 *
 * @param {string} serial
 * @param {string[]} packages
 */
export async function loadMissingAppIcons(serial, packages) {
  for (const packageName of packages) {
    const key = iconCacheKey(serial, packageName);
    if (!iconCache.has(key)) {
      iconCache.set(key, null);
    }
  }
}

/**
 * @param {string} serial
 * @param {string[]} packages
 * @param {number} [limit]
 */
export function warmupMissingAppIcons(serial, packages, limit = 4) {
  void serial;
  void packages;
  void limit;
  // Icons are populated by icon-helper extract ingest; no background APK pulls.
}

/**
 * @param {string} serial
 * @param {string} packageName
 * @returns {Promise<string | null>}
 */
export async function loadOneAppIcon(serial, packageName) {
  const key = iconCacheKey(serial, packageName);
  if (iconCache.has(key)) {
    return iconCache.get(key) ?? null;
  }

  iconLoading.add(key);
  try {
    iconCache.set(key, null);
    return null;
  } finally {
    iconLoading.delete(key);
  }
}

function iconCacheKey(serial, packageName) {
  return `${serial}::${packageName}`;
}
