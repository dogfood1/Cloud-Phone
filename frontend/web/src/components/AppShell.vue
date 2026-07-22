<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AuthLayer from "./AuthLayer.vue";
import AuthPasswordModal from "./AuthPasswordModal.vue";
import ConsoleLayout from "./ConsoleLayout.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";
import { useAuth } from "../composables/useAuth.js";
import { useDevices } from "../composables/useDevices.js";
import { logInfo } from "../utils/app-event-logger.js";
import {
  loadSettings,
  normalizeDeviceInterval,
  normalizeScreenshotInterval,
  saveSettings,
} from "../utils/settings-store.js";

const {
  state: authState,
  showAuthLayer,
  showLoginModal,
  showPasswordChangeModal,
  passwordChangeMode,
  passwordStatusText,
  loadSession,
  submitLogin,
  submitPasswordChange,
  openPasswordChange,
  closePasswordChange,
  logout,
} = useAuth();

const { t } = useI18n();
const feedback = useAppFeedback();

const activeTab = ref("devices");
const selectedDevice = ref(null);
const settingsForm = reactive(loadSettings());

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

async function handlePasswordChangeFromSettings() {
  await handlePasswordChange();
}

async function handleLogout() {
  logInfo("auth", "auth.logout", "退出登录");
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
  feedback.success(
    t("settings.savedFeedback", {
      device: settingsForm.deviceListIntervalSeconds,
      screenshot: settingsForm.screenshotIntervalSeconds,
    }),
  );
  logInfo("settings", "settings.save", "保存刷新设置", {
    details: {
      deviceListIntervalSeconds: settingsForm.deviceListIntervalSeconds,
      screenshotIntervalSeconds: settingsForm.screenshotIntervalSeconds,
    },
  });

  if (authState.authenticated) {
    startDevices();
  }
}
</script>

<template>
  <div class="app-shell">
    <AuthLayer
      v-if="showAuthLayer"
      :show-login-modal="showLoginModal"
      :show-password-change-modal="showPasswordChangeModal"
      :password-change-mode="passwordChangeMode"
      :state="authState"
      @login="handleLogin"
      @change-password="handlePasswordChange"
    />
    <div
      v-if="showPasswordChangeModal && authState.authenticated"
      class="modal-layer"
      @click.self="closePasswordChange"
    >
      <section class="auth-card-shell">
        <div class="auth-card-shell__body">
          <AuthPasswordModal
            :state="authState"
            mode="voluntary"
            @submit="handlePasswordChangeFromSettings"
            @cancel="closePasswordChange"
          />
        </div>
      </section>
    </div>
    <ConsoleLayout
      v-else-if="!showAuthLayer"
      v-model:active-tab="activeTab"
      v-model:selected-device="selectedDevice"
      :devices="devices"
      :device-loading="deviceLoading"
      :device-error="deviceError"
      :last-refreshed-at="lastRefreshedAt"
      :adb-path="adbPath"
      :screenshot-url="screenshotUrl"
      :settings-form="settingsForm"
      :password-status-text="passwordStatusText"
      :session-expires-at="authState.sessionExpiresAt"
      @logout="handleLogout"
      @save-settings="saveSettingsForm"
      @change-password="openPasswordChange"
      @refresh-devices="refreshDevices"
    />
  </div>
</template>
