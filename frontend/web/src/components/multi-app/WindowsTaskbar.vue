<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { NPopover } from "naive-ui";
import { Icon } from "@iconify/vue";

import Win11TaskbarIcon from "./Win11TaskbarIcon.vue";
import WindowsClockPanel from "./WindowsClockPanel.vue";
import WindowsQuickSettingsPanel from "./WindowsQuickSettingsPanel.vue";
import WindowsStartMenu from "./WindowsStartMenu.vue";

defineProps({
  serial: {
    type: String,
    default: "",
  },
  windows: {
    type: Array,
    default: () => [],
  },
  focusedId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["launch", "focus-window"]);

const now = ref(new Date());
const startOpen = ref(false);
const quickSettingsOpen = ref(false);
const clockOpen = ref(false);
const trayWifiEnabled = ref(true);
const trayVolumeMuted = ref(false);

let clockTimer = null;

const timeText = computed(() =>
  now.value.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }),
);

const dateText = computed(() =>
  now.value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }),
);

const trayWifiIcon = computed(() => (trayWifiEnabled.value ? "lucide:wifi" : "lucide:wifi-off"));
const trayVolumeIcon = computed(() =>
  trayVolumeMuted.value ? "lucide:volume-x" : "lucide:volume-2",
);

function handleQuickStatus(status) {
  if (typeof status?.wifiEnabled === "boolean") {
    trayWifiEnabled.value = status.wifiEnabled;
  }
  if (typeof status?.volumeMuted === "boolean") {
    trayVolumeMuted.value = status.volumeMuted;
  }
}

function closeOtherPanels(except) {
  if (except !== "start") {
    startOpen.value = false;
  }
  if (except !== "quick") {
    quickSettingsOpen.value = false;
  }
  if (except !== "clock") {
    clockOpen.value = false;
  }
}

function onLaunch(app) {
  startOpen.value = false;
  emit("launch", app);
}

function initialsFor(win) {
  const source = win.label || win.packageName || "?";
  return String(source).trim().slice(0, 1).toUpperCase();
}

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer);
  }
});
</script>

<template>
  <footer class="win11-taskbar" aria-label="Windows 11 任务栏">
    <div class="win11-taskbar__center">
      <NPopover
        v-model:show="startOpen"
        trigger="click"
        placement="top"
        :show-arrow="false"
        class="win11-taskbar-popover win11-taskbar-popover--start"
        @update:show="(open) => open && closeOtherPanels('start')"
      >
        <template #trigger>
          <button
            type="button"
            class="win11-taskbar__btn win11-taskbar__btn--start"
            :class="{ 'is-active': startOpen }"
            aria-label="开始"
          >
            <Win11TaskbarIcon name="start" :size="26" />
          </button>
        </template>
        <WindowsStartMenu :serial="serial" :active="startOpen" @launch="onLaunch" />
      </NPopover>

      <div class="win11-taskbar__apps" aria-label="打开的应用">
        <button
          v-for="win in windows"
          :key="win.id"
          type="button"
          class="win11-taskbar__app"
          :class="{
            'is-active': focusedId === win.id && !win.minimized,
            'is-minimized': win.minimized,
          }"
          :title="win.label || win.packageName"
          @click="emit('focus-window', win.id)"
        >
          <span class="win11-taskbar__app-icon" aria-hidden="true">
            <img v-if="win.iconDataUrl" :src="win.iconDataUrl" alt="" />
            <span v-else>{{ initialsFor(win) }}</span>
          </span>
          <span class="win11-taskbar__app-name">{{ win.label || win.packageName }}</span>
        </button>
      </div>
    </div>

    <div class="win11-taskbar__tray" aria-label="系统托盘">
      <NPopover
        v-model:show="quickSettingsOpen"
        trigger="click"
        placement="top-end"
        :show-arrow="false"
        class="win11-taskbar-popover"
        @update:show="(open) => open && closeOtherPanels('quick')"
      >
        <template #trigger>
          <button
            type="button"
            class="win11-taskbar__sys-cell"
            :class="{ 'is-active': quickSettingsOpen }"
            aria-label="快速设置"
          >
            <Icon :icon="trayWifiIcon" :width="18" :height="18" />
            <Icon :icon="trayVolumeIcon" :width="18" :height="18" />
          </button>
        </template>
        <WindowsQuickSettingsPanel
          :serial="serial"
          :active="quickSettingsOpen"
          @status="handleQuickStatus"
        />
      </NPopover>

      <NPopover
        v-model:show="clockOpen"
        trigger="click"
        placement="top-end"
        :show-arrow="false"
        class="win11-taskbar-popover win11-taskbar-popover--clock"
        @update:show="(open) => open && closeOtherPanels('clock')"
      >
        <template #trigger>
          <button
            type="button"
            class="win11-taskbar__clock"
            :class="{ 'is-active': clockOpen }"
            aria-label="通知中心和日历"
          >
            <span class="win11-taskbar__clock-time">{{ timeText }}</span>
            <span class="win11-taskbar__clock-date">{{ dateText }}</span>
          </button>
        </template>
        <WindowsClockPanel :now="now" :serial="serial" :active="clockOpen" />
      </NPopover>
    </div>
  </footer>
</template>
