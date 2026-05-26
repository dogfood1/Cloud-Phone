<script setup>
defineProps({
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
});
</script>

<template>
  <fieldset class="mirror-settings__group mirror-settings__group--disabled">
    <legend>音频</legend>

    <p class="mirror-settings__field-hint">
      网页投屏走设备 WebSocket 服务，当前 scrcpy-server 在 web 模式下不传输音频；以下选项与 escrcpy 对齐，供后续扩展。
    </p>

    <label class="mirror-settings__check mirror-settings__field--disabled">
      <input type="checkbox" checked disabled />
      <span>禁用音频（web 模式固定）</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="audio.keepOnDevice" type="checkbox" disabled />
      <span>保持设备音频</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="audio.audioDup" type="checkbox" disabled />
      <span>音频复制到主机（--audio-dup）</span>
    </label>

    <label class="mirror-settings__field">
      <span>音频源</span>
      <select v-model="audio.source" disabled>
        <option v-for="item in audioSources" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field">
      <span>比特率 (K)</span>
      <input v-model.number="audio.bitRateKbps" type="number" min="16" max="512" step="8" disabled />
    </label>

    <label class="mirror-settings__field">
      <span>音频编码器</span>
      <select v-model="audio.encoder" disabled>
        <option v-for="item in audioEncoders" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>
  </fieldset>
</template>
