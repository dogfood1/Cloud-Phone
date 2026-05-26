<script setup>
import { computed, watch } from "vue";

import { AUDIO_BITRATE_PRESETS_KBPS, MIRROR_AUDIO_SOURCES } from "../../utils/mirror-audio-constants.js";
import {
  ANDROID_SDK_AUDIO_DUP_MIN,
  isAudioDupSupported,
  parseDeviceSdk,
} from "../../utils/mirror-audio-platform.js";

const props = defineProps({
  audio: {
    type: Object,
    required: true,
  },
  audioCodeOptions: {
    type: Array,
    required: true,
  },
  audioSources: {
    type: Array,
    required: true,
  },
  deviceSdk: {
    type: [Number, String],
    default: 0,
  },
  videoDisabled: {
    type: Boolean,
    default: false,
  },
  encodersLoading: {
    type: Boolean,
    default: false,
  },
});

const sdk = computed(() => parseDeviceSdk(props.deviceSdk));
const audioDupSupported = computed(() => isAudioDupSupported(props.deviceSdk));

const filteredAudioSources = computed(() => {
  const list = props.audioSources?.length ? props.audioSources : MIRROR_AUDIO_SOURCES;

  if (sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN) {
    return list.filter((item) => item.value !== "playback");
  }

  return list;
});

const audioActive = computed(() => props.videoDisabled || !props.audio.disabled);
const fieldsDisabled = computed(() => !audioActive.value);

const webPcmHint = computed(() => {
  const sdkHint =
    sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN
      ? `当前设备 Android SDK ${sdk.value}：与 scrcpy 一致，--audio-dup / playback 需 Android 13（SDK ${ANDROID_SDK_AUDIO_DUP_MIN}）+；未勾选复制时手机会静音，仅浏览器播放。`
      : "";

  if (!props.videoDisabled) {
    return ["与视频同投时通过 PCM 传声到浏览器。", sdkHint].filter(Boolean).join(" ");
  }

  return ["仅音频模式：PCM 经 WebSocket 到浏览器（48 kHz 立体声）。", sdkHint].filter(Boolean).join(" ");
});

watch(audioDupSupported, (supported) => {
  if (!supported) {
    props.audio.audioDup = false;
  }

  if (sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN && props.audio.source === "playback") {
    props.audio.source = "output";
  }
});
</script>

<template>
  <fieldset
    class="mirror-settings__group"
    :class="{ 'mirror-settings__group--disabled': fieldsDisabled && !videoDisabled }"
  >
    <legend>音频</legend>

    <p class="mirror-settings__field-hint">
      {{ webPcmHint }}
    </p>

    <label
      v-if="!videoDisabled"
      class="mirror-settings__check"
      :class="{ 'mirror-settings__field--disabled': fieldsDisabled }"
    >
      <input v-model="audio.disabled" type="checkbox" />
      <span>禁用音频（--no-audio）</span>
    </label>

    <label
      class="mirror-settings__check"
      :class="{ 'mirror-settings__field--disabled': fieldsDisabled || !audioDupSupported }"
    >
      <input
        v-model="audio.audioDup"
        type="checkbox"
        :disabled="fieldsDisabled || !audioDupSupported"
      />
      <span>音频复制到设备（--audio-dup）</span>
    </label>
    <p v-if="!audioDupSupported && sdk > 0" class="mirror-settings__field-hint">
      需要 Android 13（SDK {{ ANDROID_SDK_AUDIO_DUP_MIN }}）及以上；本机 SDK {{ sdk }} 仅能在浏览器播放，手机扬声器会静音。
    </p>
    <p v-else-if="audioDupSupported" class="mirror-settings__field-hint">
      开启后切换为 playback 源，手机与浏览器同时出声；关闭则仅浏览器播放。
    </p>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>音频源（--audio-source）</span>
      <select v-model="audio.source" :disabled="fieldsDisabled">
        <option
          v-for="item in filteredAudioSources"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>音频编码（--audio-code）</span>
      <select v-model="audio.audioCode" :disabled="fieldsDisabled || !audioCodeOptions.length">
        <option v-for="item in audioCodeOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span v-if="encodersLoading" class="mirror-settings__field-hint">正在加载设备音频编码器…</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>比特率</span>
      <select v-model.number="audio.bitRateKbps" :disabled="fieldsDisabled">
        <option
          v-for="item in AUDIO_BITRATE_PRESETS_KBPS"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>缓冲（--audio-buffer）</span>
      <input
        v-model.number="audio.bufferMs"
        type="number"
        min="0"
        max="5000"
        step="10"
        :disabled="fieldsDisabled"
      />
      <span class="mirror-settings__field-hint">桌面 scrcpy 播放缓冲；Web 投屏当前忽略</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>输出缓冲（--audio-output-buffer）</span>
      <input
        v-model.number="audio.outputBufferMs"
        type="number"
        min="0"
        max="5000"
        step="10"
        :disabled="fieldsDisabled"
      />
      <span class="mirror-settings__field-hint">桌面 scrcpy 输出缓冲；Web 投屏当前忽略</span>
    </label>
  </fieldset>
</template>
