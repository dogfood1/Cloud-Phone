<script setup>
import { computed } from "vue";

import AppSidebar from "./AppSidebar.vue";
import DeviceWorkspace from "./DeviceWorkspace.vue";
import DevicesPanel from "./DevicesPanel.vue";
import GroupControlPanel from "./GroupControlPanel.vue";
import LogsPanel from "./LogsPanel.vue";
import MobileBottomNav from "./MobileBottomNav.vue";
import RedroidManagerPanel from "./RedroidManagerPanel.vue";
import SettingsPanel from "./SettingsPanel.vue";
import { useMobileLayout } from "../composables/useMobileLayout.js";
import { logInfo } from "../utils/app-event-logger.js";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  deviceLoading: {
    type: Boolean,
    required: true,
  },
  deviceError: {
    type: String,
    required: true,
  },
  lastRefreshedAt: {
    type: String,
    default: null,
  },
  adbPath: {
    type: String,
    default: "",
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
  settingsForm: {
    type: Object,
    required: true,
  },
  passwordStatusText: {
    type: String,
    required: true,
  },
  sessionExpiresAt: {
    type: String,
    default: null,
  },
});

const activeTab = defineModel("activeTab", { type: String, required: true });
const selectedDevice = defineModel("selectedDevice", { type: Object, default: null });
const { isMobileLayout } = useMobileLayout();

const workspaceDevice = computed(() => {
  const selected = selectedDevice.value;

  if (!selected?.serial) {
    return selected;
  }

  return props.devices.find((device) => device.serial === selected.serial) ?? selected;
});

const emit = defineEmits(["logout", "save-settings", "refresh-devices", "change-password"]);

function handleOpenDevice(device) {
  logInfo("device", "device.open", `打开设备工作区：${device.displayName ?? device.serial}`, {
    deviceSerial: device.serial,
    deviceName: device.displayName ?? device.serial,
    details: {
      platform: device.platform,
      state: device.state,
      connected: device.connected,
    },
  });
  selectedDevice.value = device;
}

function handleCloseWorkspace() {
  const device = selectedDevice.value;

  if (device?.serial) {
    logInfo("navigation", "workspace.close", `退出设备工作区：${device.displayName ?? device.serial}`, {
      deviceSerial: device.serial,
      deviceName: device.displayName ?? device.serial,
    });
  }

  selectedDevice.value = null;
}

function handleTabChange(tabId) {
  const previousTab = activeTab.value;
  activeTab.value = tabId;

  logInfo("navigation", "tab.change", `切换页面：${previousTab} → ${tabId}`, {
    details: {
      from: previousTab,
      to: tabId,
    },
  });

  if (tabId !== "devices") {
    if (selectedDevice.value?.serial) {
      logInfo("navigation", "workspace.close", `切换 Tab 关闭设备工作区：${selectedDevice.value.displayName ?? selectedDevice.value.serial}`, {
        deviceSerial: selectedDevice.value.serial,
        deviceName: selectedDevice.value.displayName ?? selectedDevice.value.serial,
        details: { reason: "tab-change", tab: tabId },
      });
    }

    selectedDevice.value = null;
  }
}
</script>

<template>
  <div class="console-layout" :class="{ 'console-layout--mobile': isMobileLayout }">
    <AppSidebar
      v-if="!isMobileLayout"
      :active-tab="activeTab"
      @update:active-tab="handleTabChange"
      @logout="emit('logout')"
    />
    <main
      class="main-panel"
      :class="{
        'main-panel--workspace': selectedDevice,
        'main-panel--devices': !selectedDevice && activeTab === 'devices',
        'main-panel--settings': !selectedDevice && activeTab === 'settings',
        'main-panel--group-control': !selectedDevice && activeTab === 'group-control',
        'main-panel--redroid': !selectedDevice && activeTab === 'redroid',
        'main-panel--logs': !selectedDevice && activeTab === 'logs',
      }"
    >
      <DeviceWorkspace
        v-if="workspaceDevice"
        :device="workspaceDevice"
        @close="handleCloseWorkspace"
      />
      <DevicesPanel
        v-else-if="activeTab === 'devices'"
        :devices="devices"
        :loading="deviceLoading"
        :error="deviceError"
        :last-refreshed-at="lastRefreshedAt"
        :adb-path="adbPath"
        :screenshot-url="screenshotUrl"
        @refresh="emit('refresh-devices')"
        @open-device="handleOpenDevice"
      />
      <GroupControlPanel
        v-else-if="activeTab === 'group-control'"
        :devices="devices"
        :loading="deviceLoading"
        :error="deviceError"
        :screenshot-url="screenshotUrl"
        @refresh="emit('refresh-devices')"
      />
      <RedroidManagerPanel
        v-else-if="activeTab === 'redroid'"
        @refresh-devices="emit('refresh-devices')"
      />
      <LogsPanel v-else-if="activeTab === 'logs'" />
      <SettingsPanel
        v-else-if="activeTab === 'settings'"
        :settings-form="settingsForm"
        :password-status-text="passwordStatusText"
        :session-expires-at="sessionExpiresAt"
        :show-logout="isMobileLayout"
        @save="emit('save-settings')"
        @change-password="emit('change-password')"
        @logout="emit('logout')"
      />
    </main>
    <MobileBottomNav
      v-if="isMobileLayout && !workspaceDevice"
      :active-tab="activeTab"
      @update:active-tab="handleTabChange"
    />
  </div>
</template>
