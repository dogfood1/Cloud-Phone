<script setup>
import AppSidebar from "./AppSidebar.vue";
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
});

const activeTab = defineModel("activeTab", { type: String, required: true });

const emit = defineEmits(["logout", "save-settings"]);
</script>

<template>
  <div class="console-layout">
    <AppSidebar v-model:active-tab="activeTab" @logout="emit('logout')" />
    <main class="main-panel">
      <DevicesPanel
        v-if="activeTab === 'devices'"
        :devices="deviceStore.devices"
        :loading="deviceStore.loading"
        :error="deviceStore.error"
        :last-refreshed-at="deviceStore.lastRefreshedAt"
        :adb-path="deviceStore.adbPath"
        :screenshot-url="deviceStore.screenshotUrl"
        @refresh="deviceStore.refresh"
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
