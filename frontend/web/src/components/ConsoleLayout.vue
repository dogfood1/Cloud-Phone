<script setup>
import AppSidebar from "./AppSidebar.vue";
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

const emit = defineEmits(["logout", "save-settings", "refresh-devices"]);
</script>

<template>
  <div class="console-layout">
    <AppSidebar v-model:active-tab="activeTab" @logout="emit('logout')" />
    <main class="main-panel">
      <DevicesPanel
        v-if="activeTab === 'devices'"
        :devices="devices"
        :loading="deviceLoading"
        :error="deviceError"
        :last-refreshed-at="lastRefreshedAt"
        :adb-path="adbPath"
        :screenshot-url="screenshotUrl"
        @refresh="emit('refresh-devices')"
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
