/**
 * Browser cache for App Manager (all installed packages).
 * Separate from launcher-icon cache (Start menu activities + icons).
 */

const FP_PREFIX = "cloud-phone.installed-apps.fp.";
const DB_NAME = "cloud-phone-installed-apps";
const DB_VERSION = 1;
const STORE = "bySerial";

export function getStoredInstalledAppsFingerprint(serial) {
  const key = String(serial || "").trim();
  if (!key || typeof localStorage === "undefined") {
    return "";
  }
  try {
    return String(localStorage.getItem(`${FP_PREFIX}${key}`) || "");
  } catch {
    return "";
  }
}

function setStoredFingerprint(serial, fingerprint) {
  const key = String(serial || "").trim();
  const fp = String(fingerprint || "").trim();
  if (!key || !fp || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(`${FP_PREFIX}${key}`, fp);
  } catch {
    // ignore
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("open IndexedDB failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "serial" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function awaitRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

/**
 * @param {string} serial
 */
export async function loadCachedInstalledApps(serial) {
  const key = String(serial || "").trim();
  if (!key) {
    return null;
  }
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const row = await awaitRequest(tx.objectStore(STORE).get(key));
      if (!row?.apps?.length) {
        return null;
      }
      return {
        fingerprint: String(row.fingerprint || "") || getStoredInstalledAppsFingerprint(key),
        apps: row.apps.map((item) => ({ ...item })),
      };
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/**
 * @param {string} serial
 * @param {string} fingerprint
 * @param {Array<Record<string, unknown>>} apps
 */
export async function saveInstalledAppsCache(serial, fingerprint, apps) {
  const key = String(serial || "").trim();
  if (!key || !Array.isArray(apps) || !apps.length) {
    return;
  }
  const fp = String(fingerprint || "").trim() || `adb:${apps.length}`;
  const payload = {
    serial: key,
    fingerprint: fp,
    updatedAt: Date.now(),
    apps: apps.map((item) => ({
      packageName: String(item.packageName || ""),
      label: String(item.label || item.packageName || ""),
      system: Boolean(item.system),
      enabled: item.enabled !== false,
      apkPath: item.apkPath ? String(item.apkPath) : "",
      iconDataUrl: item.iconDataUrl ? String(item.iconDataUrl) : null,
    })),
  };
  setStoredFingerprint(key, fp);
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await awaitRequest(tx.objectStore(STORE).put(payload));
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("save cache failed"));
        tx.onabort = () => reject(tx.error || new Error("save cache aborted"));
      });
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}

/**
 * @param {string} serial
 */
export async function clearInstalledAppsCache(serial) {
  const key = String(serial || "").trim();
  if (!key) {
    return;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`${FP_PREFIX}${key}`);
    }
  } catch {
    // ignore
  }
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await awaitRequest(tx.objectStore(STORE).delete(key));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}
