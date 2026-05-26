<script setup>
import { reactive, ref, watch } from "vue";

import { useMirrorCastOptions } from "../../composables/useMirrorCastOptions.js";
import { createDefaultMirrorSettings } from "../../utils/mirror-cast-defaults.js";
import MirrorCastAudioSection from "./MirrorCastAudioSection.vue";
import MirrorCastDeviceSection from "./MirrorCastDeviceSection.vue";
import MirrorCastScreenSection from "./MirrorCastScreenSection.vue";
import MirrorCastVideoSection from "./MirrorCastVideoSection.vue";

const props = defineProps({
  serial: {
    type: String,
    required: true,
  },
});

const settings = reactive(createDefaultMirrorSettings());
const appQuery = ref("");

const {
  loading,
  error,
  videoEncoders,
  audioEncoders,
  audioSources,
  displays,
  apps,
} = useMirrorCastOptions(() => props.serial);

watch(
  displays,
  (items) => {
    if (!settings.screen.displayId && items.length) {
      settings.screen.displayId = items[0].value;
    }
  },
  { immediate: true },
);

function getSettings() {
  return settings;
}

defineExpose({ getSettings });
</script>

<template>
  <div class="mirror-settings">
    <p v-if="loading" class="mirror-settings__status">正在加载设备选项…</p>
    <p v-else-if="error" class="mirror-settings__status mirror-settings__status--error">
      {{ error }}
    </p>

    <MirrorCastVideoSection :video="settings.video" :video-encoders="videoEncoders" />
    <MirrorCastAudioSection
      :audio="settings.audio"
      :audio-encoders="audioEncoders"
      :audio-sources="audioSources"
    />
    <MirrorCastDeviceSection :device-options="settings.device" />
    <MirrorCastScreenSection
      v-model:app-query="appQuery"
      :screen="settings.screen"
      :displays="displays"
      :apps="apps"
    />
  </div>
</template>
