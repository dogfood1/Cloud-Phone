<script setup>
import { computed, ref, toRef, watch } from "vue";

import { useDeviceScrcpyCast } from "../composables/useDeviceScrcpyCast.js";

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

const emit = defineEmits(["cast-failed"]);

const canvasRef = ref(null);
const serialRef = toRef(() => props.device.serial);
const { status, errorMessage, startCast, stopCast } = useDeviceScrcpyCast(serialRef, canvasRef);

const isStreaming = computed(() => status.value === "streaming");
const isStarting = computed(() => status.value === "starting");
const hasError = computed(() => status.value === "error");

watch(
  () => props.casting,
  async (casting, wasCasting) => {
    if (casting && !wasCasting) {
      await startCast();
      return;
    }

    if (!casting && wasCasting) {
      await stopCast();
    }
  },
);

watch(hasError, (failed) => {
  if (failed) {
    emit("cast-failed");
  }
});
</script>

<template>
  <div class="device-cast-viewport">
    <canvas
      v-show="isStreaming || isStarting"
      ref="canvasRef"
      class="device-cast-viewport__canvas"
      :aria-label="`${device.displayName} 投屏`"
    />
    <div v-if="!casting || !device.connected" class="device-cast-viewport__placeholder">
      <p v-if="!device.connected">设备未在线，无法投屏。</p>
      <p v-else-if="!casting">点击左侧「开始投屏」预览设备画面。</p>
    </div>
    <div v-else-if="isStarting" class="device-cast-viewport__overlay">
      <p>正在启动 scrcpy H.264 投屏…</p>
    </div>
    <div v-else-if="hasError" class="device-cast-viewport__overlay device-cast-viewport__overlay--error">
      <p>{{ errorMessage }}</p>
      <span class="device-cast-viewport__hint">请确认已执行 node tools/build-scrcpy.mjs 且设备已通过 ADB 连接。</span>
    </div>
    <div v-else-if="isStreaming" class="device-cast-viewport__badge">H.264 · scrcpy</div>
  </div>
</template>
