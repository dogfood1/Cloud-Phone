<script setup>
import { computed } from "vue";

import AppIcon from "./AppIcon.vue";
import { DEVICE_WORKSPACE_ACTIONS } from "../utils/device-workspace-actions.js";
import { getDeviceStateLabel } from "../utils/device-format.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

defineEmits(["close"]);

const actions = DEVICE_WORKSPACE_ACTIONS;
const stateLabel = computed(() => getDeviceStateLabel(props.device.state));
</script>

<template>
  <section class="device-workspace">
    <header class="device-workspace__header">
      <div class="device-workspace__intro">
        <button type="button" class="device-workspace__back" @click="$emit('close')">
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
        >
          <AppIcon :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </header>

    <div class="device-workspace__split">
      <div class="device-workspace__pane device-workspace__pane--left" aria-label="左侧区域" />
      <div class="device-workspace__pane device-workspace__pane--right" aria-label="右侧区域" />
    </div>
  </section>
</template>
