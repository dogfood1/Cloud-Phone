<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRef, unref, watch } from "vue";

import { useDeviceCast } from "../composables/useDeviceCast.js";

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

const emit = defineEmits(["cast-failed", "fullscreen-change", "screen-size-change"]);

const canvasRef = ref(null);
const rotatorRef = ref(null);
const viewportRef = ref(null);
const castOptionsRef = defineModel("castOptions", {
  type: Object,
  default: () => ({ maxSize: 1024 }),
});

const cast = useDeviceCast(
  toRef(() => props.device),
  canvasRef,
  castOptionsRef,
  rotatorRef,
  viewportRef,
);

function resolveCastRecordingSupported(castOptions) {
  const checker = cast.isCastRecordingSupported;

  if (typeof checker === "function") {
    return checker(castOptions);
  }

  return false;
}

const status = computed(() => cast.status.value);
const errorMessage = computed(() => cast.errorMessage.value);
const startupLogText = computed(() => cast.startupLogText.value);
const showStartupLogs = computed(() => cast.showStartupLogs.value);
const isRecording = computed(() => cast.isRecording.value);
const recordingElapsedMs = computed(() => cast.recordingElapsedMs.value);
const castVideoRecordingSupported = computed(() => Boolean(unref(cast.castVideoRecordingSupported)));
const castAudioRecordingSupported = computed(() => Boolean(unref(cast.castAudioRecordingSupported)));
const isCastRecordingSupported = computed(() =>
  resolveCastRecordingSupported(castOptionsRef.value),
);
const displayScreenOn = computed(() => cast.displayScreenOn.value);

const isStreaming = computed(() => status.value === "streaming");
const isStarting = computed(() => status.value === "starting");
const hasError = computed(() => status.value === "error");
const screenshotFlashActive = ref(false);
const isFullscreen = ref(false);

function getFullscreenElement() {
  return document.fullscreenElement ?? null;
}

function syncFullscreenState() {
  const viewportEl = viewportRef.value;
  const workspaceEl = viewportEl?.closest(".device-workspace") ?? null;
  const fullscreenEl = getFullscreenElement();
  const nextFullscreen =
    fullscreenEl === viewportEl || (workspaceEl != null && fullscreenEl === workspaceEl);

  isFullscreen.value = nextFullscreen;
  emit("fullscreen-change", nextFullscreen);
}

async function toggleFullscreen() {
  const viewportEl = viewportRef.value;
  const workspaceEl = viewportEl?.closest(".device-workspace") ?? null;
  const targetEl = workspaceEl ?? viewportEl;

  if (!targetEl) {
    return;
  }

  try {
    const fullscreenEl = getFullscreenElement();
    if (fullscreenEl === targetEl || fullscreenEl === viewportEl) {
      await document.exitFullscreen();
    } else {
      await targetEl.requestFullscreen();
    }
  } catch {
    // Ignore gesture/permission errors from Fullscreen API.
  }
}

function playScreenshotFlash() {
  screenshotFlashActive.value = false;

  void nextTick(() => {
    screenshotFlashActive.value = true;
  });
}

function onScreenshotFlashEnd(event) {
  if (event.animationName !== "device-cast-screenshot-flash") {
    return;
  }

  screenshotFlashActive.value = false;
}

function onViewportPointerDown() {
  void cast.resumeCastAudio();
}

watch(hasError, (failed, wasFailed) => {
  if (failed && !wasFailed && (props.casting || status.value === "starting")) {
    emit("cast-failed");
  }
});

watch(
  () => {
    const size = cast.getEffectiveScreenSize();
    return `${size.width}x${size.height}`;
  },
  () => {
    const size = cast.getEffectiveScreenSize();
    emit("screen-size-change", { width: size.width, height: size.height });
  },
);

if (typeof document !== "undefined") {
  document.addEventListener("fullscreenchange", syncFullscreenState);
}

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("fullscreenchange", syncFullscreenState);
  }
});

defineExpose({
  activeCastMode: cast.activeCastMode,
  beginCast: (payload) => cast.beginCast(payload),
  stopCast: (options) => cast.stopCast(options),
  sendNavigation: (...args) => cast.sendNavigation(...args),
  sendNavigationPress: (...args) => cast.sendNavigationPress(...args),
  displayScreenOn: cast.displayScreenOn,
  applyPreviewRotation: (...args) => cast.applyPreviewRotation(...args),
  playScreenshotFlash,
  status: cast.status,
  errorMessage: cast.errorMessage,
  isRecording: cast.isRecording,
  recordingElapsedMs: cast.recordingElapsedMs,
  castVideoRecordingSupported: cast.castVideoRecordingSupported,
  castAudioRecordingSupported: cast.castAudioRecordingSupported,
  isCastRecordingSupported: resolveCastRecordingSupported,
  startCastRecording: (...args) => cast.startCastRecording(...args),
  stopCastRecording: (...args) => cast.stopCastRecording(...args),
  toggleCastRecording: (...args) => cast.toggleCastRecording(...args),
  resumeCastAudio: (...args) => cast.resumeCastAudio(...args),
  sendCameraControl: (...args) => cast.sendCameraControl(...args),
  pasteClipboardToDevice: (...args) => cast.pasteClipboardToDevice(...args),
  copyClipboardFromDevice: (...args) => cast.copyClipboardFromDevice(...args),
  getEffectiveScreenSize: () => cast.getEffectiveScreenSize(),
});
</script>

<template>
  <div ref="viewportRef" class="device-cast-viewport">
    <button
      type="button"
      class="device-cast-viewport__fullscreen-btn"
      :title="isFullscreen ? '退出全屏 (Esc)' : '全屏'"
      @click="toggleFullscreen"
    >
      {{ isFullscreen ? "退出全屏" : "全屏" }}
    </button>
    <div
      class="device-cast-viewport__stage"
      :class="{ 'device-cast-viewport__stage--idle': !casting && !isStreaming && !isStarting }"
      @pointerdown="onViewportPointerDown"
    >
      <div ref="rotatorRef" class="device-cast-viewport__rotator">
        <canvas
          ref="canvasRef"
          class="device-cast-viewport__canvas device-cast-viewport__canvas--interactive"
          :aria-label="`${device.displayName} 投屏`"
        />
      </div>
    </div>

    <div
      v-if="!casting || !device.connected"
      class="device-cast-viewport__placeholder"
    >
      <p v-if="!device.connected">设备未在线，无法投屏。</p>
      <p v-else-if="!casting">点击左侧「开始投屏」预览设备画面。</p>
    </div>
    <div
      v-else-if="!isStarting && !isStreaming && !hasError"
      class="device-cast-viewport__overlay"
    >
      <p>正在准备投屏连接…</p>
    </div>
    <div v-else-if="showStartupLogs" class="device-cast-viewport__overlay device-cast-viewport__overlay--logs">
      <div class="device-cast-viewport__log-panel">
        <p class="device-cast-viewport__log-title">
          {{ device.platform === "harmony" ? "正在启动鸿蒙投屏…" : "正在启动 scrcpy 投屏…" }}
        </p>
        <pre class="device-cast-viewport__log-text">{{ startupLogText }}</pre>
      </div>
    </div>
    <div v-else-if="hasError" class="device-cast-viewport__overlay device-cast-viewport__overlay--error">
      <p>{{ errorMessage }}</p>
      <span v-if="device.platform !== 'harmony'" class="device-cast-viewport__hint">
        请确认设备已 adb 连接、已执行 node tools/build-scrcpy-server.mjs，并使用 Chrome/Edge 浏览器。
      </span>
    </div>
    <div
      v-if="screenshotFlashActive"
      class="device-cast-viewport__screenshot-flash"
      aria-hidden="true"
      @animationend="onScreenshotFlashEnd"
    />
  </div>
</template>
