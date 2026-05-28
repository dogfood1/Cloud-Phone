<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import DeviceAppManager from "./DeviceAppManager.vue";
import DeviceCastViewport from "./DeviceCastViewport.vue";
import DeviceFileExplorer from "./DeviceFileExplorer.vue";
import DeviceTerminal from "./DeviceTerminal.vue";
import DeviceWorkspaceToolbar from "./DeviceWorkspaceToolbar.vue";
import DeviceWorkspaceLeftPanel from "./DeviceWorkspaceLeftPanel.vue";
import { useDeviceWorkspaceToolbar } from "../composables/useDeviceWorkspaceToolbar.js";
import { getDeviceStateLabel } from "../utils/device-format.js";
import {
  buildCastPayloadFromCameraSettings,
  buildCastPayloadFromMirrorSettings,
} from "../utils/build-cast-payload.js";
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

const isCasting = ref(false);
const castBusy = ref(false);
const castHint = ref("");
const castOptions = ref(buildCastPayloadFromMirrorSettings(createDefaultMirrorSettings()));
const castViewportRef = ref(null);
const leftPanelRef = ref(null);
const filesExplorerOpen = ref(false);
const filesExplorerPath = ref(null);
const appsManagerOpen = ref(false);
const terminalOpen = ref(false);
const mobileCastOptionsOpen = ref(false);
const isMobileLayout = ref(false);
const mobileCastOptionsInitialized = ref(false);
const isViewportFullscreen = ref(false);
const fullscreenLayoutMode = ref("portrait");
const fullscreenAutoRotationDeg = ref(0);
const screenLongHorizontal = ref(window.innerWidth >= window.innerHeight);
const fullscreenMobileToolbarActionIds = new Set([
  "recents",
  "home",
  "back",
  "screen-off",
  "power",
  "volume",
  "screenshot",
  "record",
]);

const {
  actions,
  volumeSubActions,
  volumeMenuOpen,
  isVolumeMenuAction,
  actionLabel,
  actionIcon,
  actionTitle,
  isActionDisabled,
  usesPressHold,
  isActionPressed,
  isActionRecording,
  onToolbarPointerDown,
  onToolbarPointerUp,
  handleToolbarClick,
  handleVolumeSubAction,
} = useDeviceWorkspaceToolbar({
  device: props.device,
  isCasting,
  castViewportRef,
  castOptions,
  mirrorSettingsRef: leftPanelRef,
  onHint: (message) => {
    castHint.value = message;
  },
  onOpenFiles: () => {
    filesExplorerPath.value = null;
    filesExplorerOpen.value = true;
  },
  onOpenApps: () => {
    appsManagerOpen.value = true;
  },
  onOpenTerminal: () => {
    terminalOpen.value = true;
  },
});

const stateLabel = computed(() => getDeviceStateLabel(props.device.state));
const toolbarActions = computed(() => {
  if (!(isMobileLayout.value && isViewportFullscreen.value)) {
    return actions;
  }

  return actions.filter((action) => fullscreenMobileToolbarActionIds.has(action.id));
});

function handleCameraControl(payload) {
  castViewportRef.value?.sendCameraControl?.(payload);
}

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

  const isCameraCast = options?.castMode === "camera";
  const audioOnly = !isCameraCast && options?.mirror?.video?.disabled === true;

  if (isCameraCast && Number(props.device.sdkVersion) > 0 && Number(props.device.sdkVersion) < 31) {
    castHint.value = "摄像头投屏需要 Android 12（API 31）及以上。";
    return;
  }

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
    if (isMobileLayout.value) {
      mobileCastOptionsOpen.value = false;
      await nextTick();
      window.dispatchEvent(new Event("resize"));
    }
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

async function handleClose() {
  await stopCast();
  emit("close");
}

function updateMobileLayoutState() {
  screenLongHorizontal.value = window.innerWidth >= window.innerHeight;
  isMobileLayout.value = window.innerWidth <= 560;

  if (isMobileLayout.value && !mobileCastOptionsInitialized.value) {
    mobileCastOptionsOpen.value = true;
    mobileCastOptionsInitialized.value = true;
  }

  if (!isMobileLayout.value) {
    mobileCastOptionsOpen.value = true;
  }
}

function updateFullscreenLayoutMode() {
  const fullscreenEl = document.fullscreenElement;
  const fullscreenWidth = fullscreenEl?.clientWidth ?? 0;
  const fullscreenHeight = fullscreenEl?.clientHeight ?? 0;
  const currentWidth =
    fullscreenWidth > 0 ? fullscreenWidth : (window.visualViewport?.width ?? window.innerWidth);
  const currentHeight =
    fullscreenHeight > 0 ? fullscreenHeight : (window.visualViewport?.height ?? window.innerHeight);
  const currentLongHorizontal = currentWidth >= currentHeight;
  fullscreenLayoutMode.value = currentLongHorizontal ? "landscape" : "portrait";

  // Mobile fullscreen: rotate preview (0/90) to minimize black bars (maximize scale).
  if (!(isMobileLayout.value && isViewportFullscreen.value)) {
    fullscreenAutoRotationDeg.value = 0;
    return;
  }

  const targetSize = castViewportRef.value?.getEffectiveScreenSize?.() ?? { width: 0, height: 0 };
  const targetW = Math.max(0, Number(targetSize.width) || 0);
  const targetH = Math.max(0, Number(targetSize.height) || 0);
  if (!targetW || !targetH || !currentWidth || !currentHeight) {
    fullscreenAutoRotationDeg.value = 0;
    return;
  }

  const scale0 = Math.min(currentWidth / targetW, currentHeight / targetH);
  const scale90 = Math.min(currentWidth / targetH, currentHeight / targetW);
  fullscreenAutoRotationDeg.value = scale90 > scale0 ? 90 : 0;
  castViewportRef.value?.applyPreviewRotation?.(fullscreenAutoRotationDeg.value);
}

async function toggleMobileCastOptions() {
  mobileCastOptionsOpen.value = !mobileCastOptionsOpen.value;
  if (!mobileCastOptionsOpen.value) {
    await nextTick();
    window.dispatchEvent(new Event("resize"));
  }
}

onMounted(() => {
  updateMobileLayoutState();
  updateFullscreenLayoutMode();
  window.addEventListener("resize", updateMobileLayoutState);
  window.addEventListener("resize", updateFullscreenLayoutMode);
  window.addEventListener("orientationchange", updateFullscreenLayoutMode);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMobileLayoutState);
  window.removeEventListener("resize", updateFullscreenLayoutMode);
  window.removeEventListener("orientationchange", updateFullscreenLayoutMode);
  void stopCast();
});

function handleFilesExplorerClose() {
  filesExplorerOpen.value = false;
  filesExplorerPath.value = null;
}

function handleOpenAppDataInFiles(devicePath) {
  appsManagerOpen.value = false;
  filesExplorerPath.value = devicePath;
  filesExplorerOpen.value = true;
}

async function handleViewportFullscreenChange(isFullscreen) {
  isViewportFullscreen.value = isFullscreen;
  updateFullscreenLayoutMode();
  if (isFullscreen && isMobileLayout.value) {
    mobileCastOptionsOpen.value = false;
  }
  if (!isFullscreen) {
    fullscreenAutoRotationDeg.value = 0;
    const restoreRotation = castOptions.value?.mirror?.video?.rotationDeg ?? 0;
    castViewportRef.value?.applyPreviewRotation?.(restoreRotation);
  }
  await nextTick();
  window.dispatchEvent(new Event("resize"));
}
</script>

<template>
  <section
    class="device-workspace"
    :class="{
      'device-workspace--fullscreen-landscape': isViewportFullscreen && fullscreenLayoutMode === 'landscape',
      'device-workspace--fullscreen-portrait': isViewportFullscreen && fullscreenLayoutMode === 'portrait',
    }"
  >
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

    </header>
    <DeviceWorkspaceToolbar
      :actions="toolbarActions"
      :volume-sub-actions="volumeSubActions"
      :volume-menu-open="volumeMenuOpen"
      :is-volume-menu-action="isVolumeMenuAction"
      :action-label="actionLabel"
      :action-icon="actionIcon"
      :action-title="actionTitle"
      :is-action-disabled="isActionDisabled"
      :uses-press-hold="usesPressHold"
      :is-action-pressed="isActionPressed"
      :is-action-recording="isActionRecording"
      :on-toolbar-pointer-down="onToolbarPointerDown"
      :on-toolbar-pointer-up="onToolbarPointerUp"
      :handle-toolbar-click="handleToolbarClick"
      :handle-volume-sub-action="handleVolumeSubAction"
      :long-horizontal="screenLongHorizontal"
    />

    <div
      class="device-workspace__split"
      :class="{
        'device-workspace__split--mobile-options-open': isMobileLayout && mobileCastOptionsOpen,
        'device-workspace__split--mobile-options-collapsed': isMobileLayout && !mobileCastOptionsOpen,
      }"
    >
      <div v-if="isMobileLayout" class="device-workspace__mobile-cast-actions">
        <button
          type="button"
          class="device-workspace__mobile-cast-toggle"
          @click="toggleMobileCastOptions"
        >
          {{ mobileCastOptionsOpen ? "收起投屏选项" : "打开投屏选项" }}
        </button>
        <button
          v-if="!mobileCastOptionsOpen"
          type="button"
          class="device-workspace__mobile-cast-stop"
          :disabled="!isCasting || castBusy"
          @click="stopCast"
        >
          取消投屏
        </button>
      </div>
      <DeviceWorkspaceLeftPanel
        v-show="!isMobileLayout || mobileCastOptionsOpen"
        ref="leftPanelRef"
        class="device-workspace__pane device-workspace__pane--left"
        :device="device"
        :casting="isCasting"
        :cast-busy="castBusy"
        :cast-hint="castHint"
        @start-cast="startCast"
        @stop-cast="stopCast"
        @cast-options-change="updateCastOptions"
        @camera-control="handleCameraControl"
      />
      <DeviceCastViewport
        v-show="!isMobileLayout || !mobileCastOptionsOpen"
        ref="castViewportRef"
        v-model:cast-options="castOptions"
        class="device-workspace__pane device-workspace__pane--right"
        :device="device"
        :casting="isCasting"
        @cast-failed="handleCastFailed"
        @fullscreen-change="handleViewportFullscreenChange"
        @screen-size-change="updateFullscreenLayoutMode"
      />
    </div>

    <DeviceFileExplorer
      :device="device"
      :open="filesExplorerOpen"
      :open-path="filesExplorerPath"
      @close="handleFilesExplorerClose"
    />
    <DeviceAppManager
      :device="device"
      :open="appsManagerOpen"
      @close="appsManagerOpen = false"
      @open-files="handleOpenAppDataInFiles"
    />
    <DeviceTerminal :device="device" :open="terminalOpen" @close="terminalOpen = false" />
  </section>
</template>
