<script setup>
import { reactive, ref, watch } from "vue";

import { useMirrorCastOptions } from "../../composables/useMirrorCastOptions.js";
import { createDefaultMirrorSettings } from "../../utils/mirror-cast-defaults.js";
import {
  applyAudioCodeSelection,
  ensureDefaultAudioCode,
} from "../../utils/mirror-audio-utils.js";
import {
  applyVideoEncoderSelection,
  buildEncoderSelectOptions,
  ensureDefaultVideoEncoder,
} from "../../utils/mirror-encoder-utils.js";
import MirrorCastAudioSection from "./MirrorCastAudioSection.vue";
import MirrorCastDeviceSection from "./MirrorCastDeviceSection.vue";
import MirrorCastScreenSection from "./MirrorCastScreenSection.vue";
import MirrorCastVideoSection from "./MirrorCastVideoSection.vue";

const props = defineProps({
  serial: {
    type: String,
    required: true,
  },
  casting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["settings-change"]);

const settings = reactive(createDefaultMirrorSettings());
const appQuery = ref("");

const {
  loading,
  encodersLoading,
  error,
  encodersError,
  videoEncoders,
  audioCodeOptions,
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

watch(
  videoEncoders,
  (encoders) => {
    ensureDefaultVideoEncoder(settings, encoders);
  },
  { immediate: true },
);

watch(
  () => settings.video.encoder,
  (encoder) => {
    const option = buildEncoderSelectOptions(videoEncoders.value).find(
      (item) => item.value === encoder,
    );

    if (option) {
      applyVideoEncoderSelection(settings, option);
    }
  },
);

watch(
  () => settings.video.disabled,
  (disabled) => {
    if (disabled) {
      settings.audio.disabled = false;
    }
  },
);

watch(
  audioCodeOptions,
  (options) => {
    ensureDefaultAudioCode(settings, options);
  },
  { immediate: true },
);

watch(
  () => settings.audio.audioCode,
  (audioCode) => {
    const option = audioCodeOptions.value.find((item) => item.value === audioCode);

    if (option) {
      applyAudioCodeSelection(settings, option);
    }
  },
);

watch(
  settings,
  () => {
    emit("settings-change", settings);
  },
  { deep: true },
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

    <template v-else>
    <MirrorCastVideoSection
      :video="settings.video"
      :video-encoders="videoEncoders"
      :encoders-loading="encodersLoading"
      :encoders-error="encodersError"
      :casting="casting"
    />
    <MirrorCastAudioSection
      :audio="settings.audio"
      :audio-code-options="audioCodeOptions"
      :audio-sources="audioSources"
      :video-disabled="settings.video.disabled"
      :encoders-loading="encodersLoading"
    />
    <MirrorCastDeviceSection :device-options="settings.device" />
    <MirrorCastScreenSection
      v-model:app-query="appQuery"
      :screen="settings.screen"
      :displays="displays"
      :apps="apps"
    />
    </template>
  </div>
</template>
