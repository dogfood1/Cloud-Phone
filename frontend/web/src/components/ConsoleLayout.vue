<script setup>
import { computed, ref } from "vue";

import AppSidebar from "./AppSidebar.vue";
import DeviceWorkspace from "./DeviceWorkspace.vue";
import DevicesPanel from "./DevicesPanel.vue";
import SettingsPanel from "./SettingsPanel.vue";

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
  settingsFeedback: {
    type: String,
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
const mobileSidebarOpen = ref(false);

const workspaceDevice = computed(() => {
  const selected = selectedDevice.value;

  if (!selected?.serial) {
    return selected;
  }

  return props.devices.find((device) => device.serial === selected.serial) ?? selected;
});

const emit = defineEmits(["logout", "save-settings", "refresh-devices", "change-password"]);

function handleOpenDevice(device) {
  selectedDevice.value = device;
}

function handleCloseWorkspace() {
  selectedDevice.value = null;
}

function handleTabChange(tabId) {
  activeTab.value = tabId;
  mobileSidebarOpen.value = false;

  if (tabId !== "devices") {
    selectedDevice.value = null;
  }
}

function openMobileSidebar() {
  mobileSidebarOpen.value = true;
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false;
}
</script>

<template>
  <div class="console-layout">
    <button type="button" class="mobile-sidebar-toggle" @click="openMobileSidebar">菜单</button>
    <button
      v-if="mobileSidebarOpen"
      type="button"
      class="mobile-sidebar-backdrop"
      aria-label="关闭菜单"
      @click="closeMobileSidebar"
    />
    <AppSidebar
      :active-tab="activeTab"
      :mobile-open="mobileSidebarOpen"
      @update:active-tab="handleTabChange"
      @logout="
        () => {
          closeMobileSidebar();
          emit('logout');
        }
      "
    />
    <main
      class="main-panel"
      :class="{
        'main-panel--workspace': selectedDevice,
        'main-panel--settings': !selectedDevice && activeTab === 'settings',
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
      <SettingsPanel
        v-else
        :settings-form="settingsForm"
        :settings-feedback="settingsFeedback"
        :password-status-text="passwordStatusText"
        :session-expires-at="sessionExpiresAt"
        @save="emit('save-settings')"
        @change-password="emit('change-password')"
      />
    </main>
  </div>
</template>
