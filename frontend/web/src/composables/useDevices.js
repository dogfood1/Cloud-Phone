import { onUnmounted, ref, watch } from "vue";

import { getErrorMessage, requestJson } from "../utils/api.js";

export function useDevices(getIntervalSeconds, getAuthenticated) {
  const devices = ref([]);
  const loading = ref(false);
  const error = ref("");
  const screenshotTick = ref(0);
  let refreshTimer = null;

  async function refresh() {
    loading.value = true;
    error.value = "";

    try {
      const result = await requestJson("/api/devices");
      devices.value = result.devices ?? [];
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
  }

  watch(getIntervalSeconds, () => {
    if (getAuthenticated()) {
      start();
    }
  });

  onUnmounted(stop);

  return {
    devices,
    loading,
    error,
    refresh,
    screenshotUrl,
    start,
    stop,
  };
}
