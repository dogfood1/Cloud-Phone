import { computed, ref, watch } from "vue";

import { requestJson } from "../utils/api.js";
import { FALLBACK_VIDEO_ENCODERS } from "../utils/mirror-cast-constants.js";
import { buildAudioCodeOptions } from "../utils/mirror-audio-utils.js";

export function useCameraCastOptions(getSerial) {
  const loading = ref(false);
  const encodersLoading = ref(false);
  const error = ref("");
  const encodersError = ref("");
  const cameras = ref([]);
  const videoEncoders = ref([...FALLBACK_VIDEO_ENCODERS]);
  const deviceAudioEncoders = ref([]);
  const audioCodeOptions = computed(() => buildAudioCodeOptions(deviceAudioEncoders.value));

  let loadGeneration = 0;

  async function loadCameras(serial) {
    const result = await requestJson(`/api/devices/${encodeURIComponent(serial)}/cameras`);
    cameras.value = result.cameras?.length ? result.cameras : [];
  }

  async function loadEncoders(serial) {
    encodersLoading.value = true;
    encodersError.value = "";

    try {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/video-encoders`,
      );

      videoEncoders.value = result.videoEncoders?.length
        ? result.videoEncoders
        : [...FALLBACK_VIDEO_ENCODERS];
      deviceAudioEncoders.value = result.audioEncoders ?? [];

      if (result.warning) {
        encodersError.value = String(result.warning);
      }
    } catch (requestError) {
      encodersError.value =
        requestError instanceof Error ? requestError.message : "加载编码器列表失败。";
      videoEncoders.value = [...FALLBACK_VIDEO_ENCODERS];
      deviceAudioEncoders.value = [];
    } finally {
      encodersLoading.value = false;
    }
  }

  async function load() {
    const serial = typeof getSerial === "function" ? getSerial() : getSerial;

    if (!serial) {
      loading.value = false;
      return;
    }

    const generation = ++loadGeneration;
    loading.value = true;
    error.value = "";

    try {
      await Promise.all([loadCameras(serial), loadEncoders(serial)]);
    } catch (requestError) {
      if (generation !== loadGeneration) {
        return;
      }

      error.value =
        requestError instanceof Error ? requestError.message : "加载摄像头信息失败。";
      cameras.value = [];
    } finally {
      if (generation === loadGeneration) {
        loading.value = false;
      }
    }
  }

  watch(
    getSerial,
    (serial) => {
      if (serial) {
        void load();
      }
    },
    { immediate: true },
  );

  return {
    loading,
    encodersLoading,
    error,
    encodersError,
    cameras,
    videoEncoders,
    audioCodeOptions,
    load,
  };
}
