import { computed, ref } from "vue";

import {
  fetchDeviceApps,
  installDeviceApk,
  uninstallDeviceApp,
} from "../utils/device-apps-api.js";
import { relayControlBuffer } from "../utils/group-control-relay-control.js";
import { getErrorMessage } from "../utils/api.js";

export function useGroupControlBatch({ activeDevicesRef }) {
  const slotMap = ref(new Map());
  const batchMode = ref(false);
  const masterSerial = ref("");
  const showAppModal = ref(false);
  const showMasterModal = ref(false);
  const showResultModal = ref(false);
  const resultTitle = ref("");
  const resultLines = ref([]);

  const activeDevices = computed(() => activeDevicesRef.value ?? []);

  function registerSlot(serial, api) {
    if (!serial) {
      return;
    }

    const next = new Map(slotMap.value);

    if (api) {
      next.set(serial, api);
    } else {
      next.delete(serial);
    }

    slotMap.value = next;
  }

  function getSlot(serial) {
    return slotMap.value.get(serial) ?? null;
  }

  function isSlotReady(serial) {
    const slot = getSlot(serial);

    return Boolean(slot?.isCastReady?.());
  }

  function broadcastNavigation(actionId) {
    for (const device of activeDevices.value) {
      if (!device.connected) {
        continue;
      }

      const slot = getSlot(device.serial);

      if (slot?.isCastReady?.()) {
        slot.sendNavigation(actionId);
      }
    }
  }

  function stopBatchMode() {
    batchMode.value = false;
    masterSerial.value = "";
  }

  function startBatchMode(serial) {
    masterSerial.value = serial;
    batchMode.value = true;
    showMasterModal.value = false;
  }

  function handleControlRelay({ buffer, screenSize, sourceSerial }) {
    if (!batchMode.value || sourceSerial !== masterSerial.value) {
      return;
    }

    for (const device of activeDevices.value) {
      if (!device.connected || device.serial === sourceSerial) {
        continue;
      }

      const slot = getSlot(device.serial);

      if (!slot?.isCastReady?.()) {
        continue;
      }

      const followerSize = slot.getScreenSize?.() ?? { width: 0, height: 0 };
      const relayed = relayControlBuffer(buffer, screenSize, followerSize);

      if (relayed) {
        slot.sendControl(relayed);
      }
    }
  }

  function getBatchRole(serial) {
    if (!batchMode.value || !activeDevices.value.some((device) => device.serial === serial)) {
      return "none";
    }

    if (serial === masterSerial.value) {
      return "master";
    }

    return "follower";
  }

  function showResults(title, lines) {
    resultTitle.value = title;
    resultLines.value = lines;
    showResultModal.value = true;
  }

  async function runBatchInstall(file) {
    const serials = activeDevices.value
      .filter((device) => device.connected)
      .map((device) => device.serial);
    const lines = [];

    for (const serial of serials) {
      try {
        await installDeviceApk(serial, file);
        lines.push({ serial, ok: true, kind: "install_ok" });
      } catch (error) {
        lines.push({
          serial,
          ok: false,
          kind: "install_fail",
          detail: getErrorMessage(error, ""),
        });
      }
    }

    return lines;
  }

  async function runBatchUninstall(packageName) {
    const serials = activeDevices.value
      .filter((device) => device.connected)
      .map((device) => device.serial);
    const lines = [];

    for (const serial of serials) {
      try {
        const apps = await fetchDeviceApps(serial);
        const exists = apps.some((app) => app.packageName === packageName);

        if (!exists) {
          lines.push({ serial, ok: true, skipped: true, kind: "uninstall_skip" });
          continue;
        }

        await uninstallDeviceApp(serial, packageName);
        lines.push({ serial, ok: true, kind: "uninstall_ok" });
      } catch (error) {
        const message = getErrorMessage(error, "");

        if (/not installed|does not exist|Unknown package/i.test(message)) {
          lines.push({ serial, ok: true, skipped: true, kind: "uninstall_skip" });
          continue;
        }

        lines.push({ serial, ok: false, kind: "uninstall_fail", detail: message });
      }
    }

    return lines;
  }

  return {
    slotMap,
    batchMode,
    masterSerial,
    showAppModal,
    showMasterModal,
    showResultModal,
    resultTitle,
    resultLines,
    registerSlot,
    broadcastNavigation,
    stopBatchMode,
    startBatchMode,
    handleControlRelay,
    getBatchRole,
    showResults,
    runBatchInstall,
    runBatchUninstall,
    isSlotReady,
  };
}
