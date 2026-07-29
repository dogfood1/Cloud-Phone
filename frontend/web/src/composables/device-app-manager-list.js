import { computed, ref } from "vue";

import { fetchDeviceApps } from "../utils/device-apps-api.js";
import { getErrorMessage } from "../utils/api.js";
import {
  fetchAndCacheInstalledApps,
  readInstalledAppsBrowserCache,
} from "../utils/device-apps-browser-resolve.js";

/**
 * True when cache rows already have real labels and/or icons.
 * @param {Array<Record<string, unknown>>} apps
 */
export function installedAppsCacheLooksRich(apps) {
  if (!Array.isArray(apps) || !apps.length) {
    return false;
  }
  return apps.some((row) => {
    const pkg = String(row?.packageName || "");
    const label = String(row?.label || "");
    return Boolean(row?.iconDataUrl) || (Boolean(label) && label !== pkg);
  });
}

/**
 * List + browser-cache helpers for App Manager.
 * @param {() => string} getSerial
 */
export function createDeviceAppListState(getSerial) {
  const listLoading = ref(false);
  const apps = ref([]);
  const listError = ref("");
  const query = ref("");

  const filteredApps = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) {
      return apps.value;
    }
    return apps.value.filter((row) => {
      const pkg = String(row.packageName || "").toLowerCase();
      const label = String(row.label ?? "").toLowerCase();
      return pkg.includes(q) || label.includes(q);
    });
  });

  async function paintFromBrowserCache() {
    const serial = getSerial();
    if (!serial) {
      return false;
    }
    try {
      const cached = await readInstalledAppsBrowserCache(serial);
      if (!cached.fromCache || !cached.apps.length) {
        return false;
      }
      apps.value = cached.apps;
      listError.value = "";
      return true;
    } catch {
      return false;
    }
  }

  async function refreshListFromNetwork(options = {}) {
    const serial = getSerial();
    const namesOnly = Boolean(options.packageNamesOnly);
    const quiet = Boolean(options.quiet) || apps.value.length > 0;
    if (!serial) {
      return;
    }
    if (!quiet) {
      listLoading.value = true;
    }
    listError.value = "";
    try {
      const result = await fetchAndCacheInstalledApps(serial, {
        packageNamesOnly: namesOnly,
      });
      apps.value = result.apps;
    } catch (error) {
      try {
        const rows = await fetchDeviceApps(serial);
        apps.value = namesOnly
          ? rows.map((row) => ({ ...row, label: row.packageName }))
          : rows;
      } catch (inner) {
        listError.value = getErrorMessage(inner, "读取应用列表失败");
        if (!apps.value.length) {
          apps.value = [];
        }
      }
      if (!apps.value.length) {
        listError.value = getErrorMessage(error, "读取应用列表失败");
      }
    } finally {
      listLoading.value = false;
    }
  }

  /**
   * @param {{
   *   packageNamesOnly?: boolean,
   *   preferCache?: boolean,
   *   cacheOnly?: boolean,
   *   quiet?: boolean,
   * }} [options]
   * @returns {Promise<{ painted: boolean }>}
   */
  async function loadList(options = {}) {
    const serial = getSerial();
    const namesOnly = Boolean(options.packageNamesOnly);
    const preferCache = options.preferCache !== false;
    if (!serial) {
      listError.value = "设备序列号无效";
      return { painted: false };
    }
    if (preferCache) {
      const painted = await paintFromBrowserCache();
      if (painted && options.cacheOnly) {
        return { painted: true };
      }
      if (painted) {
        void refreshListFromNetwork({ packageNamesOnly: namesOnly, quiet: true });
        return { painted: true };
      }
    }
    await refreshListFromNetwork({
      packageNamesOnly: namesOnly,
      quiet: Boolean(options.quiet),
    });
    return { painted: false };
  }

  return {
    listLoading,
    apps,
    listError,
    query,
    filteredApps,
    loadList,
    paintFromBrowserCache,
  };
}
