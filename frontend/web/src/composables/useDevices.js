import { computed, onUnmounted, ref, watch } from "vue";

import { getErrorMessage, requestJson } from "../utils/api.js";
import { sortDevices } from "../utils/device-format.js";

export function useDevices(
  getDeviceIntervalSeconds,
  getScreenshotIntervalSeconds,
  getAuthenticated,
  getGalleryPollingEnabled = () => true,
) {
  const devices = ref([]);
  const initialLoading = ref(false);
  const error = ref("");
  const screenshotTick = ref(0);
  const lastRefreshedAt = ref(null);
  const adbPath = ref("");
  let deviceTimer = null;
  let screenshotTimer = null;

  const sortedDevices = computed(() => sortDevices(devices.value));

  async function refreshDevices({ showInitialLoading = false } = {}) {
    const isFirstLoad = devices.value.length === 0;

    if (showInitialLoading || isFirstLoad) {
      initialLoading.value = true;
    }

    try {
      const result = await requestJson("/api/devices");
      devices.value = result.devices ?? [];
      adbPath.value = result.adbPath ?? "";
      lastRefreshedAt.value = new Date().toISOString();
      error.value = "";
    } catch (requestError) {
      if (devices.value.length === 0) {
        error.value = getErrorMessage(requestError, "设备列表加载失败。");
      }
    } finally {
      initialLoading.value = false;
    }
  }

  function refreshScreenshots() {
    screenshotTick.value += 1;
  }

  async function refresh() {
    await refreshDevices({ showInitialLoading: devices.value.length === 0 });
    refreshScreenshots();
  }

  function screenshotUrl(serial) {
    return `/api/devices/${encodeURIComponent(serial)}/screenshot?t=${screenshotTick.value}`;
  }

  function start() {
    stop();

    if (!getAuthenticated()) {
      return;
    }

    const deviceIntervalMs = getDeviceIntervalSeconds() * 1000;
    const screenshotIntervalMs = getScreenshotIntervalSeconds() * 1000;

    refreshDevices({ showInitialLoading: true });
    refreshScreenshots();

    deviceTimer = window.setInterval(() => {
      if (!getGalleryPollingEnabled()) {
        return;
      }

      refreshDevices();
    }, deviceIntervalMs);

    screenshotTimer = window.setInterval(() => {
      if (!getGalleryPollingEnabled()) {
        return;
      }

      refreshScreenshots();
    }, screenshotIntervalMs);
  }

  function stop() {
    if (deviceTimer) {
      window.clearInterval(deviceTimer);
      deviceTimer = null;
    }

    if (screenshotTimer) {
      window.clearInterval(screenshotTimer);
      screenshotTimer = null;
    }

    devices.value = [];
    lastRefreshedAt.value = null;
    adbPath.value = "";
    initialLoading.value = false;
    error.value = "";
  }

  watch([getDeviceIntervalSeconds, getScreenshotIntervalSeconds, getGalleryPollingEnabled], () => {
    if (getAuthenticated()) {
      start();
    }
  });

  onUnmounted(stop);

  return {
    devices: sortedDevices,
    loading: initialLoading,
    error,
    lastRefreshedAt,
    adbPath,
    refresh,
    screenshotUrl,
    start,
    stop,
  };
}
