<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import DeviceCastViewport from "./DeviceCastViewport.vue";
import DeviceWorkspaceLeftPanel from "./DeviceWorkspaceLeftPanel.vue";
import { DEVICE_WORKSPACE_ACTIONS } from "../utils/device-workspace-actions.js";
import { getDeviceStateLabel } from "../utils/device-format.js";

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
const castOptions = ref({ maxSize: 1024, control: true, video: true, audio: false });
const castViewportRef = ref(null);

const stateLabel = computed(() => getDeviceStateLabel(props.device.state));

function startCast(options) {
  if (!props.device.connected) {
    return;
  }

  if (options) {
    castOptions.value = options;
  }

  isCasting.value = true;
}

function stopCast() {
  isCasting.value = false;
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

  const navigationAction = actionId === "volume" ? "volume-up" : actionId;
  castViewportRef.value?.sendNavigation?.(navigationAction);
}

function handleClose() {
  stopCast();
  emit("close");
}

onBeforeUnmount(stopCast);
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
          <span>{{ action.label }}</span>
        </button>
      </div>
    </header>

    <div class="device-workspace__split">
      <DeviceWorkspaceLeftPanel
        class="device-workspace__pane device-workspace__pane--left"
        :device="device"
        :casting="isCasting"
        @start-cast="startCast"
        @stop-cast="stopCast"
      />
      <DeviceCastViewport
        ref="castViewportRef"
        v-model:cast-options="castOptions"
        class="device-workspace__pane device-workspace__pane--right"
        :device="device"
        :casting="isCasting"
        @cast-failed="stopCast"
      />
    </div>
  </section>
</template>
