<script setup>
import { computed, toRef } from "vue";

import AppIcon from "./AppIcon.vue";
import { useDeviceTerminal } from "../composables/useDeviceTerminal.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const { status, errorMessage, hostRef, reconnect } = useDeviceTerminal({
  device: toRef(props, "device"),
  open: toRef(props, "open"),
});

const statusLabel = computed(() => {
  switch (status.value) {
    case "connecting":
      return "正在连接…";
    case "connected":
      return "已连接";
    case "closed":
      return "已断开";
    case "error":
      return "连接失败";
    default:
      return "";
  }
});

function handleClose() {
  emit("close");
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="device-files-overlay device-terminal-overlay"
      role="presentation"
      @click="handleBackdropClick"
    >
      <section
        class="device-terminal"
        role="dialog"
        aria-modal="true"
        aria-label="设备终端"
        @click.stop
      >
        <header class="device-terminal__header">
          <div class="device-terminal__title">
            <AppIcon name="terminal" />
            <div>
              <h3>终端</h3>
              <p>{{ device.displayName }} · {{ device.serial }}</p>
            </div>
          </div>
          <div class="device-terminal__actions">
            <span class="device-terminal__status" :class="`device-terminal__status--${status}`">
              {{ statusLabel }}
            </span>
            <button
              type="button"
              class="device-terminal__btn"
              title="重新连接"
              :disabled="status === 'connecting'"
              @click="reconnect"
            >
              重连
            </button>
            <button type="button" class="device-files__close" title="关闭" @click="handleClose">
              ×
            </button>
          </div>
        </header>

        <p v-if="errorMessage" class="device-terminal__error">{{ errorMessage }}</p>

        <div ref="hostRef" class="device-terminal__screen" aria-label="ADB Shell 终端" />

        <footer class="device-terminal__footer">
          <span>支持 Tab、方向键与 ANSI 彩色输出（xterm.js + adb shell -tt）</span>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
