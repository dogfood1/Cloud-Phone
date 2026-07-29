import { onBeforeUnmount, watch } from "vue";

import { useIconHelperGate } from "./useIconHelperGate.js";
import { warmDeviceAppsBrowserCache } from "../utils/warm-device-apps-cache.js";

/**
 * Warm caches when multi-app desktop mounts (complements connect-time warm).
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

  watch(
    () => resolveSerial(),
    (serial) => {
      stopSync();
      if (!serial) {
        return;
      }
      void (async () => {
        await warmDeviceAppsBrowserCache(serial, {
          prepareIconHelper: (s, opts) => gate.prepareIconHelper(s, opts),
          // Desktop already has its own Start-menu consent UI; stay silent here
          // when consent is undecided (ADB cache is enough until user opens Start).
          promptConsent: false,
        });
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
