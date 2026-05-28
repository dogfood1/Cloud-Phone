<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import DeviceAppManager from "./DeviceAppManager.vue";
import DeviceCastViewport from "./DeviceCastViewport.vue";
import DeviceFileExplorer from "./DeviceFileExplorer.vue";
import DeviceTerminal from "./DeviceTerminal.vue";
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

const toolbarRef = ref(null);
const toolbarDragActive = ref(false);
const toolbarDragPointerId = ref(null);
const toolbarDragOffset = ref({ x: 0, y: 0 });
const toolbarDragPos = ref({ x: null, y: null });

const fullscreenToolbarStyle = computed(() => {
  if (!(isMobileLayout.value && isViewportFullscreen.value)) {
    return null;
  }

  if (toolbarDragPos.value.x == null || toolbarDragPos.value.y == null) {
    return null;
  }

  return {
    left: `${toolbarDragPos.value.x}px`,
    top: `${toolbarDragPos.value.y}px`,
    right: "auto",
    bottom: "auto",
  };
});

function clampToolbarPos(x, y) {
  const fullscreenEl = document.fullscreenElement;
  const boundsEl = fullscreenEl instanceof HTMLElement ? fullscreenEl : document.documentElement;
  const rect = boundsEl.getBoundingClientRect();
  const toolbarEl = toolbarRef.value instanceof HTMLElement ? toolbarRef.value : null;
  const tbRect = toolbarEl?.getBoundingClientRect();

  const tbW = tbRect?.width ?? 0;
  const tbH = tbRect?.height ?? 0;

  const insetTop = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-top")) || 0;
  void insetTop;

  const padding = 8;
  const minX = rect.left + padding;
  const minY = rect.top + padding;
  const maxX = rect.left + rect.width - tbW - padding;
  const maxY = rect.top + rect.height - tbH - padding;

  const nextX = Math.min(Math.max(x, minX), Math.max(minX, maxX));
  const nextY = Math.min(Math.max(y, minY), Math.max(minY, maxY));
  return { x: nextX - rect.left, y: nextY - rect.top };
}

function setToolbarPosFromClient(clientX, clientY) {
  const fullscreenEl = document.fullscreenElement;
  const boundsEl = fullscreenEl instanceof HTMLElement ? fullscreenEl : document.documentElement;
  const rect = boundsEl.getBoundingClientRect();
  const rawX = clientX - toolbarDragOffset.value.x;
  const rawY = clientY - toolbarDragOffset.value.y;
  const clamped = clampToolbarPos(rawX, rawY);
  toolbarDragPos.value = { x: clamped.x, y: clamped.y };
}

function onToolbarDragPointerMove(event) {
  if (!toolbarDragActive.value || toolbarDragPointerId.value !== event.pointerId) {
    return;
  }
  event.preventDefault();
  setToolbarPosFromClient(event.clientX, event.clientY);
}

function stopToolbarDrag() {
  toolbarDragActive.value = false;
  toolbarDragPointerId.value = null;
}

function onToolbarDragPointerUp(event) {
  if (toolbarDragPointerId.value === event.pointerId) {
    stopToolbarDrag();
  }
}

function onToolbarDragStart(event) {
  if (!(isMobileLayout.value && isViewportFullscreen.value)) {
    return;
  }
  if (!(event.target instanceof Element)) {
    return;
  }
  if (event.target.closest("button")) {
    return;
  }

  const toolbarEl = toolbarRef.value instanceof HTMLElement ? toolbarRef.value : null;
  if (!toolbarEl) {
    return;
  }

  toolbarDragActive.value = true;
  toolbarDragPointerId.value = event.pointerId;

  const rect = toolbarEl.getBoundingClientRect();
  toolbarDragOffset.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  if (toolbarDragPos.value.x == null || toolbarDragPos.value.y == null) {
    const fullscreenEl = document.fullscreenElement;
    const boundsEl = fullscreenEl instanceof HTMLElement ? fullscreenEl : document.documentElement;
    const bounds = boundsEl.getBoundingClientRect();
    toolbarDragPos.value = { x: rect.left - bounds.left, y: rect.top - bounds.top };
  }

  try {
    toolbarEl.setPointerCapture(event.pointerId);
  } catch {
    // ignore
  }
}

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
  window.addEventListener("pointermove", onToolbarDragPointerMove, { passive: false });
  window.addEventListener("pointerup", onToolbarDragPointerUp);
  window.addEventListener("pointercancel", onToolbarDragPointerUp);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMobileLayoutState);
  window.removeEventListener("resize", updateFullscreenLayoutMode);
  window.removeEventListener("orientationchange", updateFullscreenLayoutMode);
  window.removeEventListener("pointermove", onToolbarDragPointerMove);
  window.removeEventListener("pointerup", onToolbarDragPointerUp);
  window.removeEventListener("pointercancel", onToolbarDragPointerUp);
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
    stopToolbarDrag();
    toolbarDragPos.value = { x: null, y: null };
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

      <div
        ref="toolbarRef"
        class="device-workspace__toolbar"
        role="toolbar"
        aria-label="设备控制"
        :style="fullscreenToolbarStyle"
        @pointerdown="onToolbarDragStart"
      >
        <template v-for="action in toolbarActions" :key="action.id">
          <div
            v-if="isVolumeMenuAction(action)"
            class="device-workspace__action-anchor device-workspace__action-anchor--volume"
          >
            <button
              type="button"
              class="device-workspace__action"
              :class="{ 'device-workspace__action--menu-open': volumeMenuOpen }"
              :disabled="isActionDisabled(action)"
              :title="actionTitle(action)"
              :aria-expanded="volumeMenuOpen"
              aria-haspopup="true"
              @click="handleToolbarClick(action, $event)"
            >
              <span class="device-workspace__action-icon" aria-hidden="true">
                <AppIcon :name="actionIcon(action)" variant="toolbar" />
              </span>
              <span class="device-workspace__action-label">{{ actionLabel(action) }}</span>
            </button>
            <div
              v-show="volumeMenuOpen"
              class="device-workspace__volume-menu"
              role="group"
              aria-label="音量调节"
            >
              <button
                v-for="sub in volumeSubActions"
                :key="sub.id"
                type="button"
                class="device-workspace__action device-workspace__action--sub"
                :disabled="isActionDisabled(action)"
                :title="sub.label"
                @click.stop="handleVolumeSubAction(sub)"
              >
                <span class="device-workspace__action-icon" aria-hidden="true">
                  <AppIcon :name="sub.icon" variant="toolbar" />
                </span>
                <span class="device-workspace__action-label">{{ sub.label }}</span>
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="device-workspace__action"
            :class="{
              'device-workspace__action--hold': usesPressHold(action),
              'device-workspace__action--pressed': isActionPressed(action),
              'device-workspace__action--recording': isActionRecording(action),
            }"
            :disabled="isActionDisabled(action)"
            :title="actionTitle(action)"
            @pointerdown="onToolbarPointerDown(action, $event)"
            @pointerup="onToolbarPointerUp(action, $event)"
            @pointercancel="onToolbarPointerUp(action, $event)"
            @click="handleToolbarClick(action, $event)"
          >
            <span class="device-workspace__action-icon" aria-hidden="true">
              <AppIcon :name="actionIcon(action)" variant="toolbar" />
            </span>
            <span class="device-workspace__action-label">{{ actionLabel(action) }}</span>
          </button>
        </template>
      </div>
    </header>

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
