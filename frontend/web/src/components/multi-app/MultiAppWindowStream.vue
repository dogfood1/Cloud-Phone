<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRef, unref, watch } from "vue";

import MultiAppVdErrorDialog from "./MultiAppVdErrorDialog.vue";
import { useDeviceCast } from "../../composables/useDeviceCast.js";
import { startDeviceCast, stopDeviceCast } from "../../utils/cast-api.js";
import {
  formatVirtualDisplayUserMessage,
  isVirtualDisplayError,
} from "../../utils/cast-error-message.js";
import { buildMultiAppCastOptions } from "../../utils/multi-app-cast-options.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  window: {
    type: Object,
    required: true,
  },
  contentWidth: {
    type: Number,
    required: true,
  },
  contentHeight: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(["close-window", "switch-mirror"]);

const canvasRef = ref(null);
const viewportRef = ref(null);
const rotatorRef = ref(null);
const castOptions = ref(
  buildMultiAppCastOptions({
    width: props.contentWidth,
    height: props.contentHeight,
    packageName: props.window.packageName,
    deviceSdk: props.device?.sdkVersion,
  }),
);

const cast = useDeviceCast(
  toRef(props, "device"),
  canvasRef,
  castOptions,
  rotatorRef,
  viewportRef,
);

const starting = ref(false);
const errorMessage = ref("");
const ready = ref(false);
const showVdError = ref(false);
const vdErrorDetail = ref("");
let resizeTimer = null;
let started = false;

const statusText = computed(() => {
  if (starting.value) {
    return "正在启动虚拟屏…";
  }
  if (errorMessage.value) {
    return errorMessage.value;
  }
  if (!ready.value) {
    return "等待画面…";
  }
  return "";
});

function presentError(raw) {
  const text = raw instanceof Error ? raw.message : String(raw || "");
  if (isVirtualDisplayError(text)) {
    const friendly = formatVirtualDisplayUserMessage(text);
    errorMessage.value = friendly;
    vdErrorDetail.value = friendly;
    showVdError.value = true;
    return;
  }
  errorMessage.value = text || "投屏启动失败";
}

async function startWindowCast({ force = false } = {}) {
  if ((!force && started) || starting.value) {
    return;
  }

  const serial = props.device?.serial;
  if (!serial) {
    presentError("设备序列号无效");
    return;
  }

  if (props.device?.platform && props.device.platform !== "android") {
    presentError("多应用窗口投屏目前仅支持 Android 设备");
    return;
  }

  if (force && started) {
    await stopWindowCast();
  }

  starting.value = true;
  errorMessage.value = "";
  showVdError.value = false;

  castOptions.value = buildMultiAppCastOptions({
    width: props.contentWidth,
    height: props.contentHeight,
    packageName: props.window.packageName,
    deviceSdk: props.device?.sdkVersion,
  });

  try {
    await nextTick();
    const payload = await startDeviceCast(serial, castOptions.value);
    await cast.beginCast(payload);
    started = true;
    ready.value = true;
  } catch (error) {
    ready.value = false;
    started = false;
    presentError(error);
  } finally {
    starting.value = false;
  }
}

function scheduleResize() {
  if (!started || !ready.value) {
    return;
  }
  if (resizeTimer) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    cast.sendResizeDisplay?.(props.contentWidth, props.contentHeight);
  }, 120);
}

function sendBack() {
  cast.sendNavigation?.("back");
}

async function stopWindowCast() {
  if (resizeTimer) {
    window.clearTimeout(resizeTimer);
    resizeTimer = null;
  }

  if (!started) {
    return;
  }

  started = false;
  ready.value = false;

  try {
    await cast.stopCast?.({ backend: false });
  } catch {
    // ignore
  }

  const serial = props.device?.serial;
  if (serial) {
    try {
      await stopDeviceCast(serial);
    } catch {
      // ignore
    }
  }
}

watch(
  () => [props.contentWidth, props.contentHeight],
  () => scheduleResize(),
);

watch(
  () => props.window.packageName,
  () => {
    void startWindowCast();
  },
  { immediate: true },
);

watch(
  () => unref(cast.errorMessage),
  (message) => {
    const text = typeof message === "string" ? message : "";
    if (text && isVirtualDisplayError(text)) {
      presentError(text);
    }
  },
);

onBeforeUnmount(() => {
  void stopWindowCast();
});

defineExpose({
  sendBack,
  stopWindowCast,
});
</script>

<template>
  <div ref="viewportRef" class="multi-app-window-stream">
    <canvas ref="canvasRef" class="multi-app-window-stream__canvas" />
    <div v-if="statusText" class="multi-app-window-stream__status">{{ statusText }}</div>
    <MultiAppVdErrorDialog
      v-model:show="showVdError"
      :detail="vdErrorDetail"
      @close-window="emit('close-window')"
      @switch-mirror="emit('switch-mirror')"
      @retry="startWindowCast({ force: true })"
    />
  </div>
</template>
