<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { NPopover } from "naive-ui";

import Win11TaskbarIcon from "./Win11TaskbarIcon.vue";
import WindowsClockPanel from "./WindowsClockPanel.vue";
import WindowsQuickSettingsPanel from "./WindowsQuickSettingsPanel.vue";

const emit = defineEmits(["exit"]);

const now = ref(new Date());
const startOpen = ref(false);
const quickSettingsOpen = ref(false);
const clockOpen = ref(false);

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

const volumeIcon = computed(() => "volume");

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

function handleExitMultiApp() {
  startOpen.value = false;
  emit("exit");
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
        class="win11-taskbar-popover"
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
        <div class="win11-flyout win11-flyout--start">
          <header class="win11-flyout__title">开始</header>
          <p class="win11-flyout__desc">Cloud Phone 多应用桌面</p>
          <button type="button" class="win11-flyout__action" @click="handleExitMultiApp">
            返回镜像投屏设置
          </button>
        </div>
      </NPopover>
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
            <Win11TaskbarIcon name="wifi" :size="18" />
            <Win11TaskbarIcon :name="volumeIcon" :size="18" />
          </button>
        </template>
        <WindowsQuickSettingsPanel />
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
        <WindowsClockPanel :now="now" />
      </NPopover>
    </div>
  </footer>
</template>
