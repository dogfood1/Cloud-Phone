import { computed, onUnmounted, ref, watch } from "vue";

import { getErrorMessage, requestJson } from "../utils/api.js";
import { sortDevices } from "../utils/device-format.js";

export function useDevices(getIntervalSeconds, getAuthenticated) {
  const devices = ref([]);
  const loading = ref(false);
  const error = ref("");
  const screenshotTick = ref(0);
  const lastRefreshedAt = ref(null);
  const adbPath = ref("");
  let refreshTimer = null;

  const sortedDevices = computed(() => sortDevices(devices.value));

  async function refresh() {
    loading.value = true;
    error.value = "";

    try {
      const result = await requestJson("/api/devices");
      devices.value = result.devices ?? [];
      adbPath.value = result.adbPath ?? "";
      lastRefreshedAt.value = new Date().toISOString();
      screenshotTick.value += 1;
    } catch (requestError) {
      error.value = getErrorMessage(requestError, "设备列表加载失败。");
    } finally {
      loading.value = false;
    }
  }

  function screenshotUrl(serial) {
    return `/api/devices/${encodeURIComponent(serial)}/screenshot?t=${screenshotTick.value}`;
  }

  function start() {
    stop();

    if (!getAuthenticated()) {
      return;
    }

    refresh();
    refreshTimer = window.setInterval(refresh, getIntervalSeconds() * 1000);
  }

  function stop() {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }

    devices.value = [];
    lastRefreshedAt.value = null;
    adbPath.value = "";
  }

  watch(getIntervalSeconds, () => {
    if (getAuthenticated()) {
      start();
    }
  });

  onUnmounted(stop);

  return {
    devices: sortedDevices,
    loading,
    error,
    lastRefreshedAt,
    adbPath,
    refresh,
    screenshotUrl,
    start,
    stop,
  };
}
