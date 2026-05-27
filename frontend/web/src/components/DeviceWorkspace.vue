<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import DeviceAppManager from "./DeviceAppManager.vue";
import DeviceCastViewport from "./DeviceCastViewport.vue";
import DeviceFileExplorer from "./DeviceFileExplorer.vue";
import DeviceWorkspaceLeftPanel from "./DeviceWorkspaceLeftPanel.vue";
import { useDeviceWorkspaceToolbar } from "../composables/useDeviceWorkspaceToolbar.js";
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

const isCasting = ref(false);
const castBusy = ref(false);
const castHint = ref("");
const castOptions = ref(buildCastPayloadFromMirrorSettings(createDefaultMirrorSettings()));
const castViewportRef = ref(null);
const leftPanelRef = ref(null);
const filesExplorerOpen = ref(false);
const filesExplorerPath = ref(null);
const appsManagerOpen = ref(false);

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
});

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

async function handleClose() {
  await stopCast();
  emit("close");
}

onBeforeUnmount(() => {
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
        <template v-for="action in actions" :key="action.id">
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

    <div class="device-workspace__split">
      <DeviceWorkspaceLeftPanel
        ref="leftPanelRef"
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
  </section>
</template>
