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
  <fieldset class="mirror-settings__group">
    <legend>音频</legend>

    <label class="mirror-settings__check">
      <input v-model="audio.disabled" type="checkbox" />
      <span>禁用音频</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="audio.keepOnDevice" type="checkbox" />
      <span>保持设备音频</span>
    </label>

    <label class="mirror-settings__field">
      <span>音频源</span>
      <select v-model="audio.source">
        <option v-for="item in audioSources" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field">
      <span>比特率 (K)</span>
      <input v-model.number="audio.bitRateKbps" type="number" min="16" max="512" step="8" />
    </label>

    <label class="mirror-settings__field">
      <span>音频编码器</span>
      <select v-model="audio.encoder">
        <option v-for="item in audioEncoders" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>
  </fieldset>
</template>
