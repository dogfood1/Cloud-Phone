<script setup>
import { computed } from "vue";

import { AUDIO_BITRATE_PRESETS_KBPS } from "../../utils/mirror-audio-constants.js";

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
  videoDisabled: {
    type: Boolean,
    default: false,
  },
  encodersLoading: {
    type: Boolean,
    default: false,
  },
});

const audioActive = computed(() => props.videoDisabled || !props.audio.disabled);

const fieldsDisabled = computed(() => !audioActive.value);

const webPcmHint = computed(() => {
  if (!props.videoDisabled) {
    return "与视频同投时，设备端音频管线仍在完善；下方参数会写入 stream extras。";
  }

  return "仅音频模式：设备通过 WebSocket 发送 PCM（48 kHz 立体声），画布显示波纹。编码器选项供后续 Opus/AAC 直传使用。";
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

    <label class="mirror-settings__check" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <input v-model="audio.audioDup" type="checkbox" :disabled="fieldsDisabled" />
      <span>音频复制到设备（--audio-dup，播放时设备仍出声）</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': fieldsDisabled }">
      <span>音频源（--audio-source）</span>
      <select v-model="audio.source" :disabled="fieldsDisabled">
        <option v-for="item in audioSources" :key="item.value" :value="item.value">
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
      <span class="mirror-settings__field-hint">对应 --audio-bit-rate（bps = Kbps × 1000）</span>
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
      <span class="mirror-settings__field-hint">桌面端输出缓冲；Web 投屏当前忽略</span>
    </label>
  </fieldset>
</template>
