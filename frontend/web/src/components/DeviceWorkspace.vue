<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import DeviceCastViewport from "./DeviceCastViewport.vue";
import DeviceWorkspaceLeftPanel from "./DeviceWorkspaceLeftPanel.vue";
import { DEVICE_WORKSPACE_ACTIONS } from "../utils/device-workspace-actions.js";
import { getDeviceStateLabel } from "../utils/device-format.js";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { startDeviceCast, stopDeviceCast } from "../utils/cast-api.js";
import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { getErrorMessage } from "../utils/api.js";
import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";
import { WsScrcpyAudioCanvas } from "../utils/ws-scrcpy-audio-canvas.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const actions = DEVICE_WORKSPACE_ACTIONS;
const CAST_NAVIGATION_IDS = new Set([
  "recents",
  "home",
  "back",
  "screen-off",
  "power",
  "rotate",
  "volume",
]);
const isCasting = ref(false);
const castBusy = ref(false);
const castHint = ref("");
const castOptions = ref(buildCastPayloadFromMirrorSettings(createDefaultMirrorSettings()));
const castViewportRef = ref(null);

const stateLabel = computed(() => getDeviceStateLabel(props.device.state));

async function startCast(options) {
  castHint.value = "";

  if (!props.device?.serial) {
    castHint.value = "设备序列号无效。";
    return;
  }

  if (!props.device.connected) {
    castHint.value = "设备未在线，无法开始投屏。";
    return;
  }

  const audioOnly = options?.mirror?.video?.disabled === true;

  if (audioOnly) {
    if (!WsScrcpyAudioCanvas.isSupported()) {
      castHint.value = "当前浏览器不支持 Web Audio，无法使用仅音频模式。";
      return;
    }
  } else if (!WsScrcpyAnnexBPlayer.isSupported()) {
    castHint.value = "当前浏览器不支持 WebCodecs，请使用 Chrome 或 Edge。";
    return;
  }

  if (options) {
    castOptions.value = options;
  }

  castBusy.value = true;

  try {
    const payload = await startDeviceCast(props.device.serial, castOptions.value);
    isCasting.value = true;
    await nextTick();

    const viewport = castViewportRef.value;
    if (!viewport?.beginCast) {
      throw new Error("投屏画面组件未就绪，请刷新页面后重试。");
    }

    await viewport.beginCast(payload);
  } catch (error) {
    isCasting.value = false;
    castHint.value = getErrorMessage(error, "投屏启动失败");
    try {
      await stopDeviceCast(props.device.serial);
    } catch {
      // ignore cleanup errors
    }
  } finally {
    castBusy.value = false;
  }
}

function updateCastOptions(options) {
  castOptions.value = options;
}

async function stopCast() {
  castHint.value = "";
  castBusy.value = true;

  try {
    await castViewportRef.value?.stopCast?.({ backend: false });
    if (props.device?.serial) {
      await stopDeviceCast(props.device.serial);
    }
  } catch (error) {
    castHint.value = getErrorMessage(error, "停止投屏失败");
  } finally {
    isCasting.value = false;
    castBusy.value = false;
  }
}

function handleCastFailed() {
  const viewport = castViewportRef.value;
  const message = viewport?.errorMessage?.value ?? viewport?.errorMessage;

  if (typeof message === "string" && message) {
    castHint.value = message;
  }

  void stopCast();
}

function isToolbarActionDisabled(actionId) {
  if (!CAST_NAVIGATION_IDS.has(actionId)) {
    return true;
  }

  return !isCasting.value;
}

function handleToolbarAction(actionId) {
  if (!isCasting.value || !CAST_NAVIGATION_IDS.has(actionId)) {
    return;
  }

  if (actionId === "screen-off") {
    const viewport = castViewportRef.value;
    const screenOn = viewport?.displayScreenOn?.value ?? true;
    viewport?.sendNavigation?.(screenOn ? "screen-off" : "screen-on");
    return;
  }

  const navigationAction = actionId === "volume" ? "volume-up" : actionId;
  castViewportRef.value?.sendNavigation?.(navigationAction);
}

const screenOffActionLabel = computed(() => {
  if (!isCasting.value) {
    return "关闭屏幕";
  }

  const screenOn = castViewportRef.value?.displayScreenOn?.value ?? true;
  return screenOn ? "关闭屏幕" : "点亮屏幕";
});

async function handleClose() {
  await stopCast();
  emit("close");
}

onBeforeUnmount(() => {
  void stopCast();
});
</script>

<template>
  <section class="device-workspace">
    <header class="device-workspace__header">
      <div class="device-workspace__intro">
        <button type="button" class="device-workspace__back" @click="handleClose">
          <AppIcon name="arrow-left" />
          <span>返回设备列表</span>
        </button>
        <div class="device-workspace__meta">
          <h2>{{ device.displayName }}</h2>
          <p>
            <span>{{ device.serial }}</span>
            <span class="device-workspace__dot">·</span>
            <span>{{ stateLabel }}</span>
          </p>
        </div>
      </div>

      <div class="device-workspace__toolbar" role="toolbar" aria-label="设备控制">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="device-workspace__action"
          :disabled="isToolbarActionDisabled(action.id)"
          @click="handleToolbarAction(action.id)"
        >
          <AppIcon :name="action.icon" />
          <span>{{ action.id === "screen-off" ? screenOffActionLabel : action.label }}</span>
        </button>
      </div>
    </header>

    <div class="device-workspace__split">
      <DeviceWorkspaceLeftPanel
        class="device-workspace__pane device-workspace__pane--left"
        :device="device"
        :casting="isCasting"
        :cast-busy="castBusy"
        :cast-hint="castHint"
        @start-cast="startCast"
        @stop-cast="stopCast"
        @cast-options-change="updateCastOptions"
      />
      <DeviceCastViewport
        ref="castViewportRef"
        v-model:cast-options="castOptions"
        class="device-workspace__pane device-workspace__pane--right"
        :device="device"
        :casting="isCasting"
        @cast-failed="handleCastFailed"
      />
    </div>
  </section>
</template>
