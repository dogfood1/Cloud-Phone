<script setup>
import AppSidebar from "./AppSidebar.vue";
import ConsolePanel from "./ConsolePanel.vue";
import DevicesPanel from "./DevicesPanel.vue";
import SettingsPanel from "./SettingsPanel.vue";

defineProps({
  deviceStore: {
    type: Object,
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
  sessionStateText: {
    type: String,
    required: true,
  },
});

const activeTab = defineModel("activeTab", { type: String, required: true });

const emit = defineEmits(["logout", "save-settings"]);
</script>

<template>
  <div class="console-layout">
    <AppSidebar v-model:active-tab="activeTab" @logout="emit('logout')" />
    <main class="main-panel">
      <ConsolePanel
        v-if="activeTab === 'console'"
        :device-count="deviceStore.devices.length"
        :devices-loading="deviceStore.loading"
        :devices-error="deviceStore.error"
        :session-state-text="sessionStateText"
        :session-expires-at="sessionExpiresAt"
        :screenshot-interval-seconds="settingsForm.screenshotIntervalSeconds"
      />
      <DevicesPanel
        v-else-if="activeTab === 'devices'"
        :devices="deviceStore.devices"
        :loading="deviceStore.loading"
        :error="deviceStore.error"
        :screenshot-url="deviceStore.screenshotUrl"
      />
      <SettingsPanel
        v-else-if="activeTab === 'settings'"
        :settings-form="settingsForm"
        :settings-feedback="settingsFeedback"
        :password-status-text="passwordStatusText"
        :session-expires-at="sessionExpiresAt"
        @save="emit('save-settings')"
      />
    </main>
  </div>
</template>
