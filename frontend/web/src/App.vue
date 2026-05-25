<script setup>
import { onMounted, reactive, ref, watch } from "vue";

import AuthLayer from "./components/AuthLayer.vue";
import ConsoleLayout from "./components/ConsoleLayout.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import { useAuth } from "./composables/useAuth.js";
import { useDevices } from "./composables/useDevices.js";
import {
  loadSettings,
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

const activeTab = ref("devices");
const settingsForm = reactive(loadSettings());
const settingsFeedback = ref("");

const deviceStore = useDevices(
  () => settingsForm.screenshotIntervalSeconds,
  () => authState.authenticated,
);

onMounted(async () => {
  const authenticated = await loadSession();

  if (authenticated) {
    deviceStore.start();
  }
});

watch(
  () => authState.authenticated,
  (authenticated) => {
    if (authenticated) {
      deviceStore.start();
      return;
    }

    deviceStore.stop();
  },
);

async function handleLogin() {
  if (await submitLogin()) {
    deviceStore.start();
  }
}

async function handlePasswordChange() {
  if (await submitPasswordChange()) {
    deviceStore.start();
  }
}

async function handleLogout() {
  await logout();
  deviceStore.stop();
}

function saveSettingsForm() {
  const normalized = normalizeScreenshotInterval(settingsForm.screenshotIntervalSeconds);
  settingsForm.screenshotIntervalSeconds = normalized;
  saveSettings({ screenshotIntervalSeconds: normalized });
  settingsFeedback.value = `截图将每 ${normalized} 秒刷新一次。`;

  if (authState.authenticated) {
    deviceStore.start();
  }
}
</script>

<template>
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
      :device-store="deviceStore"
      :settings-form="settingsForm"
      :settings-feedback="settingsFeedback"
      :password-status-text="passwordStatusText"
      :session-expires-at="authState.sessionExpiresAt"
      @logout="handleLogout"
      @save-settings="saveSettingsForm"
    />
  </div>
</template>
