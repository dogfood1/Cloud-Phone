import { onBeforeUnmount, watch } from "vue";

import { useIconHelperGate } from "./useIconHelperGate.js";
import { isIconHelperFirstSetupDone } from "../utils/icon-helper-consent.js";
import {
  prefetchLauncherAppsToBrowserCache,
  readLauncherAppsBrowserCache,
} from "../utils/launcher-apps-browser-resolve.js";
import { clearLauncherAppsCache } from "../utils/launcher-icon-browser-cache.js";

/**
 * Warm Icon Helper when multi-app desktop mounts.
 * First enter (no first-setup / no browser icons): show progress + force reload.
 * @param {import("vue").Ref | import("vue").ComputedRef | (() => string)} serialSource
 */
export function useMultiAppIconWarm(serialSource) {
  const gate = useIconHelperGate();
  let syncTimer = null;

  function resolveSerial() {
    if (typeof serialSource === "function") {
      return String(serialSource() || "").trim();
    }
    return String(serialSource?.value || "").trim();
  }

  function stopSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  function startSync(serial) {
    stopSync();
    if (!serial) {
      return;
    }
    syncTimer = setInterval(() => {
      void gate.syncIconHelper(serial);
    }, 12_000);
  }

  async function shouldForceFirstLoad(serial) {
    if (!isIconHelperFirstSetupDone(serial)) {
      return true;
    }
    const cached = await readLauncherAppsBrowserCache(serial);
    return !cached.fromCache || !cached.apps.some((item) => item.iconDataUrl);
  }

  watch(
    () => resolveSerial(),
    (serial) => {
      stopSync();
      if (!serial) {
        return;
      }
      void (async () => {
        const force = await shouldForceFirstLoad(serial);
        if (force) {
          await clearLauncherAppsCache(serial);
        }
        const result = await gate.warmIconHelper(serial, { force });
        if (result?.ok && !result.packageNamesOnly) {
          await prefetchLauncherAppsToBrowserCache(serial);
        }
        startSync(serial);
      })();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopSync();
  });

  return gate;
}
