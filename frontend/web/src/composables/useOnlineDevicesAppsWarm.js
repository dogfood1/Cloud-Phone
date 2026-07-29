import { onBeforeUnmount, watch } from "vue";

import { useIconHelperGate } from "./useIconHelperGate.js";
import { warmDeviceAppsBrowserCache } from "../utils/warm-device-apps-cache.js";

/**
 * When devices become ADB-online, prefetch app lists into browser IndexedDB.
 * @param {import("vue").Ref | import("vue").ComputedRef} devicesRef
 */
export function useOnlineDevicesAppsWarm(devicesRef) {
  const gate = useIconHelperGate();
  /** @type {Set<string>} */
  const warmed = new Set();
  /** @type {Set<string>} */
  const inFlight = new Set();

  async function warmSerial(serial) {
    const key = String(serial || "").trim();
    if (!key || warmed.has(key) || inFlight.has(key)) {
      return;
    }
    inFlight.add(key);
    try {
      await warmDeviceAppsBrowserCache(key, {
        prepareIconHelper: (s, opts) => gate.prepareIconHelper(s, opts),
        promptConsent: true,
      });
      warmed.add(key);
    } finally {
      inFlight.delete(key);
    }
  }

  watch(
    () => {
      const list = devicesRef?.value;
      if (!Array.isArray(list)) {
        return [];
      }
      return list
        .filter((device) => device?.connected && device?.serial)
        .map((device) => String(device.serial));
    },
    (serials) => {
      for (const serial of serials) {
        void warmSerial(serial);
      }
      for (const key of [...warmed]) {
        if (!serials.includes(key)) {
          warmed.delete(key);
        }
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    warmed.clear();
    inFlight.clear();
  });

  return gate;
}
