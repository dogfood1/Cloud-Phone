<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";

import MultiAppWindow from "./MultiAppWindow.vue";
import MultiAppWindowStream from "./MultiAppWindowStream.vue";
import WindowsTaskbar from "./WindowsTaskbar.vue";
import IconHelperGatePanel from "../IconHelperGatePanel.vue";
import { useMultiAppIconWarm } from "../../composables/useMultiAppIconWarm.js";
import { useMultiAppWindows } from "../../composables/useMultiAppWindows.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["switch-mirror"]);

const {
  consentDialogOpen,
  phase,
  progress,
  progressPercent,
  packageNamesOnly,
  answerConsent,
} = useMultiAppIconWarm(() => props.device?.serial || "");

const desktopRef = ref(null);
const canvasSize = ref({ width: 1280, height: 720 });
/** @type {import("vue").Ref<Record<string, object>>} */
const streamRefs = ref({});

const {
  windows,
  focusedId,
  taskbarWindows,
  openOrFocusApp,
  focusWindow,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
  updateWindowBounds,
  getContentSize,
  TITLE_BAR_H,
  MIN_W,
  MIN_H,
} = useMultiAppWindows();

let desktopObserver = null;

function measureDesktop() {
  const el = desktopRef.value;
  if (!el) {
    return;
  }
  canvasSize.value = {
    width: el.clientWidth || 1280,
    height: el.clientHeight || 720,
  };
}

function setStreamRef(id, el) {
  if (el) {
    streamRefs.value[id] = el;
  } else {
    delete streamRefs.value[id];
  }
}

function handleLaunch(app) {
  openOrFocusApp(app, {
    canvasWidth: canvasSize.value.width,
    canvasHeight: canvasSize.value.height,
  });
}

function handleFocus(id) {
  focusWindow(id);
}

function handleMinimize(id) {
  minimizeWindow(id);
}

function handleMaximize(id) {
  toggleMaximizeWindow(id, {
    canvasWidth: canvasSize.value.width,
    canvasHeight: canvasSize.value.height,
  });
}

function handleClose(id) {
  closeWindow(id);
}

function handleMove(id, bounds) {
  updateWindowBounds(id, bounds);
}

function handleResize(id, bounds) {
  updateWindowBounds(id, bounds);
}

function handleBack(id) {
  streamRefs.value[id]?.sendBack?.();
}

function contentSize(win) {
  return getContentSize(win);
}

onMounted(() => {
  measureDesktop();
  desktopObserver = new ResizeObserver(() => measureDesktop());
  if (desktopRef.value) {
    desktopObserver.observe(desktopRef.value);
  }
});

onBeforeUnmount(() => {
  desktopObserver?.disconnect();
});

watch(
  () => props.device?.serial,
  () => measureDesktop(),
);
</script>

<template>
  <div class="multi-app-desktop">
    <div class="multi-app-desktop__wallpaper" aria-hidden="true" />

    <div ref="desktopRef" class="multi-app-desktop__canvas" aria-label="Windows 桌面">
      <MultiAppWindow
        v-for="win in windows"
        :key="win.id"
        :window="win"
        :focused="focusedId === win.id"
        :title-bar-height="TITLE_BAR_H"
        :min-width="MIN_W"
        :min-height="MIN_H"
        @focus="handleFocus(win.id)"
        @back="handleBack(win.id)"
        @minimize="handleMinimize(win.id)"
        @maximize="handleMaximize(win.id)"
        @close="handleClose(win.id)"
        @move="handleMove(win.id, $event)"
        @resize="handleResize(win.id, $event)"
      >
        <MultiAppWindowStream
          :ref="(el) => setStreamRef(win.id, el)"
          :device="device"
          :window="win"
          :content-width="contentSize(win).width"
          :content-height="contentSize(win).height"
          @close-window="handleClose(win.id)"
          @switch-mirror="emit('switch-mirror')"
        />
      </MultiAppWindow>
    </div>

    <WindowsTaskbar
      :serial="device.serial"
      :windows="taskbarWindows"
      :focused-id="focusedId"
      @launch="handleLaunch"
      @focus-window="handleFocus"
    />

    <IconHelperGatePanel
      :consent-open="consentDialogOpen"
      :busy="phase === 'ensuring' || phase === 'extracting' || progress.phase === 'running'"
      :progress-percent="progressPercent"
      :progress-label="phase === 'ensuring' ? '正在连接 Icon Helper…' : '正在提取应用图标…'"
      :current-package="progress.current"
      :denied-hint="packageNamesOnly"
      @allow="answerConsent(true)"
      @deny="answerConsent(false)"
    />
  </div>
</template>
