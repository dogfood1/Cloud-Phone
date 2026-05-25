<script setup>
import { computed } from "vue";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  casting: {
    type: Boolean,
    required: true,
  },
});

const streamUrl = computed(() => {
  if (!props.casting || !props.device?.serial) {
    return "";
  }

  return `/api/devices/${encodeURIComponent(props.device.serial)}/cast/stream`;
});
</script>

<template>
  <div class="device-cast-viewport">
    <img
      v-if="casting && device.connected"
      :key="streamUrl"
      class="device-cast-viewport__frame"
      :src="streamUrl"
      :alt="`${device.displayName} 投屏`"
    />
    <div v-else class="device-cast-viewport__placeholder">
      <p v-if="!device.connected">设备未在线，无法投屏。</p>
      <p v-else-if="!casting">点击左侧「开始投屏」预览设备画面。</p>
      <p v-else>正在连接投屏流…</p>
      <span class="device-cast-viewport__hint">当前为默认投屏（ADB 截图流），左侧参数暂未生效。</span>
    </div>
  </div>
</template>
