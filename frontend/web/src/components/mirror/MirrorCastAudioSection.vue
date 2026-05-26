<script setup>
import { computed } from "vue";

const props = defineProps({
  audio: {
    type: Object,
    required: true,
  },
  audioEncoders: {
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
});

const audioOnlyMode = computed(() => props.videoDisabled);
</script>

<template>
  <fieldset
    class="mirror-settings__group"
    :class="{ 'mirror-settings__group--disabled': !audioOnlyMode }"
  >
    <legend>音频</legend>

    <p v-if="audioOnlyMode" class="mirror-settings__field-hint">
      已禁用视频：设备通过 WebSocket 发送 PCM（48 kHz 立体声），画布显示波纹并尝试播放。Opus/AAC 编码器选项后续完善。
    </p>
    <p v-else class="mirror-settings__field-hint">
      与视频同时投屏时可用；仅音频请勾选上方「禁用视频」。
    </p>

    <label class="mirror-settings__check" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <input v-model="audio.disabled" type="checkbox" :disabled="!audioOnlyMode" />
      <span>禁用音频</span>
    </label>

    <label class="mirror-settings__check" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <input v-model="audio.keepOnDevice" type="checkbox" :disabled="!audioOnlyMode" />
      <span>保持设备音频</span>
    </label>

    <label class="mirror-settings__check" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <input v-model="audio.audioDup" type="checkbox" :disabled="!audioOnlyMode" />
      <span>音频复制到主机（--audio-dup）</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <span>音频源</span>
      <select v-model="audio.source" :disabled="!audioOnlyMode">
        <option v-for="item in audioSources" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <span>比特率 (K)</span>
      <input
        v-model.number="audio.bitRateKbps"
        type="number"
        min="16"
        max="512"
        step="8"
        :disabled="!audioOnlyMode"
      />
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': !audioOnlyMode }">
      <span>音频编码器</span>
      <select v-model="audio.encoder" :disabled="!audioOnlyMode">
        <option v-for="item in audioEncoders" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span v-if="audioOnlyMode" class="mirror-settings__field-hint">当前仅音频模式使用 PCM 直传，编码器选项预留</span>
    </label>
  </fieldset>
</template>
