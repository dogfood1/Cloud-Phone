/**
 * Persist launcher apps + icons in the browser.
 * Fingerprint in localStorage; app rows (with iconDataUrl) in IndexedDB.
 */

const FP_PREFIX = "cloud-phone.launcher.fp.";
const DB_NAME = "cloud-phone-launcher-icons";
const DB_VERSION = 1;
const STORE = "bySerial";

/**
 * @param {string} serial
 */
export function getStoredLauncherFingerprint(serial) {
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

/**
 * @param {string} serial
 * @param {string} fingerprint
 */
export function setStoredLauncherFingerprint(serial, fingerprint) {
  const key = String(serial || "").trim();
  const fp = String(fingerprint || "").trim();
  if (!key || !fp || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(`${FP_PREFIX}${key}`, fp);
  } catch {
    // quota / private mode
  }
}

/**
 * @returns {Promise<IDBDatabase>}
 */
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

/**
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
function awaitRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

/**
 * @param {string} serial
 * @returns {Promise<{ fingerprint: string, apps: Array<Record<string, unknown>> } | null>}
 */
export async function loadCachedLauncherApps(serial) {
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
      const fingerprint =
        String(row.fingerprint || "") || getStoredLauncherFingerprint(key);
      return {
        fingerprint,
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
export async function saveLauncherAppsCache(serial, fingerprint, apps) {
  const key = String(serial || "").trim();
  const fp = String(fingerprint || "").trim();
  if (!key || !Array.isArray(apps) || !apps.length) {
    return;
  }

  const payload = {
    serial: key,
    fingerprint: fp,
    updatedAt: Date.now(),
    apps: apps.map((item) => ({
      packageName: String(item.packageName || ""),
      activity: String(item.activity || ""),
      label: String(item.label || item.packageName || ""),
      iconDataUrl: item.iconDataUrl ? String(item.iconDataUrl) : null,
    })),
  };

  if (fp) {
    setStoredLauncherFingerprint(key, fp);
  }

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
    // ignore persistence failures; in-memory UI still works
  }
}

/**
 * @param {string} serial
 */
export async function clearLauncherAppsCache(serial) {
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
