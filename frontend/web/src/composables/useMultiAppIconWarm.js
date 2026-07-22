import { onBeforeUnmount, watch } from "vue";

import { useIconHelperGate } from "./useIconHelperGate.js";

/**
 * Warm Icon Helper as soon as multi-app desktop mounts; poll for package changes.
 * @param {import("vue").Ref | import("vue").ComputedRef | (() => string)} serialSource
 */
export function useMultiAppIconWarm(serialSource) {
  const gate = useIconHelperGate();
  let syncTimer = null;

  function resolveSerial() {
    if (typeof serialSource === "function") {
      return String(serialSource() || "");
    }
    return String(serialSource?.value || "");
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
      void gate.warmIconHelper(serial).then(() => startSync(serial));
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopSync();
  });

  return gate;
}
