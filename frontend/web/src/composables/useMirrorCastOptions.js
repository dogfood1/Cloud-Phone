import { computed, ref, watch } from "vue";

import { requestJson } from "../utils/api.js";
import {
  FALLBACK_AUDIO_SOURCES,
  FALLBACK_VIDEO_ENCODERS,
} from "../utils/mirror-cast-constants.js";
import { MIRROR_AUDIO_SOURCES } from "../utils/mirror-audio-constants.js";
import { buildAudioCodeOptions } from "../utils/mirror-audio-utils.js";

export function useMirrorCastOptions(getSerial) {
  const loading = ref(false);
  const encodersLoading = ref(false);
  const error = ref("");
  const encodersError = ref("");
  const videoEncoders = ref([...FALLBACK_VIDEO_ENCODERS]);
  const deviceAudioEncoders = ref([]);
  const audioCodeOptions = computed(() => buildAudioCodeOptions(deviceAudioEncoders.value));
  const audioSources = ref([...FALLBACK_AUDIO_SOURCES]);
  const displays = ref([{ value: "0", label: "默认屏幕 (0)" }]);
  const apps = ref([]);

  let loadGeneration = 0;
  let encoderLoadGeneration = 0;

  async function loadVideoEncoders(serial) {
    const generation = ++encoderLoadGeneration;
    encodersLoading.value = true;
    encodersError.value = "";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);

    try {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/video-encoders`,
        { signal: controller.signal },
      );

      if (generation !== encoderLoadGeneration) {
        return;
      }

      videoEncoders.value = result.videoEncoders?.length
        ? result.videoEncoders
        : [...FALLBACK_VIDEO_ENCODERS];

      deviceAudioEncoders.value = result.audioEncoders ?? [];

      if (result.warning) {
        encodersError.value = String(result.warning);
      }
    } catch (requestError) {
      if (generation !== encoderLoadGeneration) {
        return;
      }

      if (requestError instanceof Error && requestError.name === "AbortError") {
        encodersError.value = "加载编码器列表超时（25 秒），请确认设备已连接并重试。";
      } else {
        encodersError.value =
          requestError instanceof Error ? requestError.message : "加载编码器列表失败。";
      }

      videoEncoders.value = [...FALLBACK_VIDEO_ENCODERS];
      deviceAudioEncoders.value = [];
    } finally {
      clearTimeout(timeoutId);

      if (generation === encoderLoadGeneration) {
        encodersLoading.value = false;
      }
    }
  }

  async function load() {
    const serial = typeof getSerial === "function" ? getSerial() : getSerial;

    if (!serial) {
      loading.value = false;
      encodersLoading.value = false;
      return;
    }

    const generation = ++loadGeneration;
    loading.value = true;
    error.value = "";

    try {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/mirror-options`,
      );

      if (generation !== loadGeneration) {
        return;
      }

      audioSources.value = result.audioSources?.length
        ? result.audioSources
        : [...MIRROR_AUDIO_SOURCES];
      displays.value = result.displays?.length
        ? result.displays
        : [{ value: "0", label: "默认屏幕 (0)" }];
      apps.value = result.apps ?? [];
    } catch (requestError) {
      if (generation !== loadGeneration) {
        return;
      }

      error.value =
        requestError instanceof Error ? requestError.message : "加载设备选项失败。";
    } finally {
      if (generation === loadGeneration) {
        loading.value = false;
      }
    }

    void loadVideoEncoders(serial);
  }

  watch(() => (typeof getSerial === "function" ? getSerial() : getSerial), load, {
    immediate: true,
  });

  return {
    loading,
    encodersLoading,
    error,
    encodersError,
    videoEncoders,
    audioCodeOptions,
    audioSources,
    displays,
    apps,
    reload: load,
  };
}
