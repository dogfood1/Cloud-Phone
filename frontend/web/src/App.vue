<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppProviders from "./components/AppProviders.vue";
import AuthLayer from "./components/AuthLayer.vue";
import ConsoleLayout from "./components/ConsoleLayout.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import { useAuth } from "./composables/useAuth.js";
import { useDevices } from "./composables/useDevices.js";
import {
  loadSettings,
  normalizeDeviceInterval,
  normalizeScreenshotInterval,
  saveSettings,
} from "./utils/settings-store.js";

const {
  state: authState,
  showAuthLayer,
  showLoginModal,
  showPasswordChangeModal,
  passwordStatusText,
  loadSession,
  submitLogin,
  submitPasswordChange,
  logout,
} = useAuth();

const { t } = useI18n();

const activeTab = ref("devices");
const selectedDevice = ref(null);
const settingsForm = reactive(loadSettings());
const settingsFeedback = ref("");

const {
  devices,
  loading: deviceLoading,
  error: deviceError,
  lastRefreshedAt,
  adbPath,
  refresh: refreshDevices,
  screenshotUrl,
  start: startDevices,
  stop: stopDevices,
} = useDevices(
  () => settingsForm.deviceListIntervalSeconds,
  () => settingsForm.screenshotIntervalSeconds,
  () => authState.authenticated,
  () => authState.authenticated && activeTab.value === "devices" && !selectedDevice.value,
);

onMounted(async () => {
  const authenticated = await loadSession();

  if (authenticated) {
    startDevices();
  }
});

watch(
  () => authState.authenticated,
  (authenticated) => {
    if (authenticated) {
      startDevices();
      return;
    }

    stopDevices();
  },
);

watch(selectedDevice, (device, previousDevice) => {
  if (!device && previousDevice) {
    refreshDevices();
  }
});

async function handleLogin() {
  if (await submitLogin()) {
    startDevices();
  }
}

async function handlePasswordChange() {
  if (await submitPasswordChange()) {
    startDevices();
  }
}

async function handleLogout() {
  await logout();
  stopDevices();
}

function saveSettingsForm() {
  settingsForm.deviceListIntervalSeconds = normalizeDeviceInterval(
    settingsForm.deviceListIntervalSeconds,
  );
  settingsForm.screenshotIntervalSeconds = normalizeScreenshotInterval(
    settingsForm.screenshotIntervalSeconds,
  );
  saveSettings({
    deviceListIntervalSeconds: settingsForm.deviceListIntervalSeconds,
    screenshotIntervalSeconds: settingsForm.screenshotIntervalSeconds,
  });
  settingsFeedback.value = t("settings.savedFeedback", {
    device: settingsForm.deviceListIntervalSeconds,
    screenshot: settingsForm.screenshotIntervalSeconds,
  });

  if (authState.authenticated) {
    startDevices();
  }
}
</script>

<template>
  <AppProviders>
    <div class="app-shell">
      <ThemeToggle v-if="showAuthLayer" class="theme-toggle--dock" />
      <AuthLayer
        v-if="showAuthLayer"
        :show-login-modal="showLoginModal"
        :show-password-change-modal="showPasswordChangeModal"
        :state="authState"
        @login="handleLogin"
        @change-password="handlePasswordChange"
      />
      <ConsoleLayout
        v-else
        v-model:active-tab="activeTab"
        v-model:selected-device="selectedDevice"
        :devices="devices"
        :device-loading="deviceLoading"
        :device-error="deviceError"
        :last-refreshed-at="lastRefreshedAt"
        :adb-path="adbPath"
        :screenshot-url="screenshotUrl"
        :settings-form="settingsForm"
        :settings-feedback="settingsFeedback"
        :password-status-text="passwordStatusText"
        :session-expires-at="authState.sessionExpiresAt"
        @logout="handleLogout"
        @save-settings="saveSettingsForm"
        @refresh-devices="refreshDevices"
      />
    </div>
  </AppProviders>
</template>
