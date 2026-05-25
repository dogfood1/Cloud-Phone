import { ref, watch } from "vue";

import { requestJson } from "../utils/api.js";
import {
  FALLBACK_AUDIO_ENCODERS,
  FALLBACK_AUDIO_SOURCES,
  FALLBACK_VIDEO_ENCODERS,
} from "../utils/mirror-cast-constants.js";

export function useMirrorCastOptions(getSerial) {
  const loading = ref(false);
  const error = ref("");
  const videoEncoders = ref([...FALLBACK_VIDEO_ENCODERS]);
  const audioEncoders = ref([...FALLBACK_AUDIO_ENCODERS]);
  const audioSources = ref([...FALLBACK_AUDIO_SOURCES]);
  const displays = ref([{ value: "0", label: "默认屏幕 (0)" }]);
  const apps = ref([]);

  async function load() {
    const serial = typeof getSerial === "function" ? getSerial() : getSerial;

    if (!serial) {
      return;
    }

    loading.value = true;
    error.value = "";

    try {
      const result = await requestJson(
        `/api/devices/${encodeURIComponent(serial)}/mirror-options`,
      );

      videoEncoders.value = result.videoEncoders?.length
        ? result.videoEncoders
        : [...FALLBACK_VIDEO_ENCODERS];
      audioEncoders.value = result.audioEncoders?.length
        ? result.audioEncoders
        : [...FALLBACK_AUDIO_ENCODERS];
      audioSources.value = result.audioSources?.length
        ? result.audioSources
        : [...FALLBACK_AUDIO_SOURCES];
      displays.value = result.displays?.length
        ? result.displays
        : [{ value: "0", label: "默认屏幕 (0)" }];
      apps.value = result.apps ?? [];
    } catch (requestError) {
      error.value =
        requestError instanceof Error ? requestError.message : "加载设备选项失败。";
    } finally {
      loading.value = false;
    }
  }

  watch(() => (typeof getSerial === "function" ? getSerial() : getSerial), load, {
    immediate: true,
  });

  return {
    loading,
    error,
    videoEncoders,
    audioEncoders,
    audioSources,
    displays,
    apps,
    reload: load,
  };
}
