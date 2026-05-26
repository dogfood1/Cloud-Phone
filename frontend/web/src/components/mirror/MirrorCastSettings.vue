<script setup>
import { reactive, ref, watch } from "vue";
import { NAlert, NCollapse, NSpin, NText } from "naive-ui";

import { useMirrorCastOptions } from "../../composables/useMirrorCastOptions.js";
import { createDefaultMirrorSettings } from "../../utils/mirror-cast-defaults.js";
import {
  applyAudioCodeSelection,
  ensureDefaultAudioCode,
} from "../../utils/mirror-audio-utils.js";
import { isAudioDupSupported } from "../../utils/mirror-audio-platform.js";
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
  deviceSdk: {
    type: [Number, String],
    default: 0,
  },
  casting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["settings-change"]);

const settings = reactive(createDefaultMirrorSettings());
const expandedPanels = ref(["video", "audio", "device", "screen"]);

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
  () => props.deviceSdk,
  () => {
    if (!isAudioDupSupported(props.deviceSdk)) {
      settings.audio.audioDup = false;
    }
  },
  { immediate: true },
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
    if (!props.casting) {
      emit("settings-change", settings);
    }
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
    <NSpin :show="loading">
      <NAlert v-if="error" type="error" :bordered="false" style="margin-bottom: 0.5rem">
        {{ error }}
      </NAlert>

      <template v-else>
        <div class="mirror-settings__body">
          <NCollapse v-model:expanded-names="expandedPanels">
            <MirrorCastVideoSection
              :video="settings.video"
              :video-encoders="videoEncoders"
              :encoders-loading="encodersLoading"
              :encoders-error="encodersError"
            />
            <MirrorCastAudioSection
              :audio="settings.audio"
              :audio-code-options="audioCodeOptions"
              :audio-sources="audioSources"
              :device-sdk="deviceSdk"
              :video-disabled="settings.video.disabled"
              :encoders-loading="encodersLoading"
            />
            <MirrorCastDeviceSection :device-options="settings.device" />
            <MirrorCastScreenSection
              :screen="settings.screen"
              :displays="displays"
              :apps="apps"
            />
          </NCollapse>

          <div v-if="casting" class="mirror-settings__lock">
            <NText strong>投屏进行中，参数已锁定</NText>
            <NText depth="3">停止投屏后可修改</NText>
          </div>
        </div>
      </template>
    </NSpin>
  </div>
</template>
