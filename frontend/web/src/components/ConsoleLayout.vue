<script setup>
import AppSidebar from "./AppSidebar.vue";
import DeviceWorkspace from "./DeviceWorkspace.vue";
import DevicesPanel from "./DevicesPanel.vue";
import SettingsPanel from "./SettingsPanel.vue";

defineProps({
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

const emit = defineEmits(["logout", "save-settings", "refresh-devices"]);

function handleOpenDevice(device) {
  selectedDevice.value = device;
}

function handleCloseWorkspace() {
  selectedDevice.value = null;
}

function handleTabChange(tabId) {
  activeTab.value = tabId;

  if (tabId !== "devices") {
    selectedDevice.value = null;
  }
}
</script>

<template>
  <div class="console-layout">
    <AppSidebar
      :active-tab="activeTab"
      @update:active-tab="handleTabChange"
      @logout="emit('logout')"
    />
    <main class="main-panel" :class="{ 'main-panel--workspace': selectedDevice }">
      <DeviceWorkspace
        v-if="selectedDevice"
        :device="selectedDevice"
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
      />
    </main>
  </div>
</template>
