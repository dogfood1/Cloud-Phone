<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, unref, watch } from "vue";

import MultiAppVdErrorDialog from "./MultiAppVdErrorDialog.vue";
import { useAppExitWatch } from "../../composables/useAppExitWatch.js";
import { useDeviceCast } from "../../composables/useDeviceCast.js";
import { startDeviceCast, stopDeviceCast } from "../../utils/cast-api.js";
import {
  formatVirtualDisplayUserMessage,
  isVirtualDisplayError,
} from "../../utils/cast-error-message.js";
import {
  buildMultiAppCastOptions,
  vdOptionsFromContent,
} from "../../utils/multi-app-cast-options.js";

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

function buildOptionsFromWindow() {
  const vd = vdOptionsFromContent(props.contentWidth, props.contentHeight);
  return buildMultiAppCastOptions({
    width: props.window.vdWidth || vd.width,
    height: props.window.vdHeight || vd.height,
    dpi: props.window.vdDpi || vd.dpi,
    packageName: props.window.packageName,
    deviceSdk: props.device?.sdkVersion,
    orientation: props.window.orientation,
  });
}

const castOptions = ref(buildOptionsFromWindow());

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
let resizeReadyAt = 0;
/** Backend cast/start succeeded for this window (consumer counted). */
let backendConsumerHeld = false;

const statusText = computed(() => {
  if (starting.value) {
    return "正在创建虚拟屏…";
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

async function releaseBackendConsumer() {
  if (!backendConsumerHeld) {
    return;
  }
  backendConsumerHeld = false;
  const serial = props.device?.serial;
  if (!serial) {
    return;
  }
  try {
    await stopDeviceCast(serial);
  } catch {
    // ignore
  }
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

  if (force && (started || backendConsumerHeld)) {
    await stopWindowCast();
  }

  starting.value = true;
  errorMessage.value = "";
  showVdError.value = false;
  ready.value = false;

  castOptions.value = buildOptionsFromWindow();

  try {
    await nextTick();
    if (!canvasRef.value) {
      await nextTick();
    }
    if (!canvasRef.value) {
      throw new Error("投屏画布未就绪");
    }

    const payload = await startDeviceCast(serial, castOptions.value);
    backendConsumerHeld = true;

    // Backend accepted — VD is being created on device. Do NOT keep the
    // "正在启动虚拟屏" overlay while waiting for the first decoded frame.
    starting.value = false;
    started = true;
    resizeReadyAt = Date.now() + 1200;

    await cast.beginCast(payload);
    ready.value = true;
  } catch (error) {
    ready.value = false;
    started = false;
    try {
      await cast.stopCast?.({ backend: false });
    } catch {
      // ignore
    }
    await releaseBackendConsumer();
    presentError(error);
  } finally {
    starting.value = false;
  }
}

function scheduleResize() {
  if (!started || !ready.value || Date.now() < resizeReadyAt) {
    return;
  }
  if (resizeTimer) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    const vd = vdOptionsFromContent(props.contentWidth, props.contentHeight);
    const prevW = Number(props.window?.vdWidth) || 0;
    const prevH = Number(props.window?.vdHeight) || 0;
    // Skip tiny drags — each RESIZE_DISPLAY resets the encoder briefly.
    if (Math.abs(vd.width - prevW) < 48 && Math.abs(vd.height - prevH) < 48) {
      return;
    }
    if (props.window) {
      props.window.vdWidth = vd.width;
      props.window.vdHeight = vd.height;
      props.window.vdDpi = vd.dpi;
    }
    cast.sendResizeDisplay?.(vd.width, vd.height);
  }, 500);
}

function sendBack() {
  cast.sendNavigation?.("back");
}

async function stopWindowCast() {
  if (resizeTimer) {
    window.clearTimeout(resizeTimer);
    resizeTimer = null;
  }

  const hadSession = started || backendConsumerHeld;
  started = false;
  ready.value = false;

  if (!hadSession) {
    return;
  }

  try {
    await cast.stopCast?.({ backend: false });
  } catch {
    // ignore
  }

  await releaseBackendConsumer();
}

watch(
  () => [props.contentWidth, props.contentHeight],
  () => scheduleResize(),
);

watch(
  () => props.window.packageName,
  (pkg, prev) => {
    if (!prev || pkg === prev) {
      return;
    }
    void startWindowCast({ force: true });
  },
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

useAppExitWatch({
  getSerial: () => String(props.device?.serial || ""),
  getPackageName: () => String(props.window?.packageName || ""),
  enabled: () => Boolean(ready.value && started && !showVdError.value),
  onExit: () => emit("close-window"),
});

onMounted(() => {
  void startWindowCast();
});

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
