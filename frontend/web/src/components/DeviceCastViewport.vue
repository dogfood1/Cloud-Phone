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
const castOptionsRef = defineModel("castOptions", {
  type: Object,
  default: () => ({ maxSize: 1024 }),
});

const serialRef = toRef(() => props.device.serial);
const { status, errorMessage, beginCast, stopCast, sendNavigation, displayScreenOn } =
  useDeviceScrcpyCast(
  serialRef,
  canvasRef,
  castOptionsRef,
);

const isStreaming = computed(() => status.value === "streaming");
const isStarting = computed(() => status.value === "starting");
const hasError = computed(() => status.value === "error");

watch(hasError, (failed) => {
  if (failed) {
    emit("cast-failed");
  }
});

defineExpose({ beginCast, stopCast, sendNavigation, displayScreenOn, status, errorMessage });
</script>

<template>
  <div class="device-cast-viewport">
    <div
      v-show="isStreaming || isStarting"
      class="device-cast-viewport__stage"
      aria-hidden="true"
    >
      <canvas
        ref="canvasRef"
        class="device-cast-viewport__canvas device-cast-viewport__canvas--interactive"
        :aria-label="`${device.displayName} 投屏`"
      />
    </div>
    <div v-if="!casting || !device.connected" class="device-cast-viewport__placeholder">
      <p v-if="!device.connected">设备未在线，无法投屏。</p>
      <p v-else-if="!casting">点击左侧「开始投屏」预览设备画面。</p>
    </div>
    <div v-else-if="!isStarting && !isStreaming && !hasError" class="device-cast-viewport__overlay">
      <p>正在准备投屏连接…</p>
    </div>
    <div v-else-if="isStarting" class="device-cast-viewport__overlay">
      <p>正在启动 scrcpy 投屏…</p>
    </div>
    <div v-else-if="hasError" class="device-cast-viewport__overlay device-cast-viewport__overlay--error">
      <p>{{ errorMessage }}</p>
      <span class="device-cast-viewport__hint">
        请确认已执行 node tools/build-scrcpy.mjs、设备已连接，并使用 Chrome/Edge 浏览器。
      </span>
    </div>
    <div v-else-if="isStreaming" class="device-cast-viewport__badge">scrcpy</div>
  </div>
</template>
