const { createApp, computed, onMounted, onUnmounted, reactive, ref, watch } = Vue;

createApp({
  setup() {
    const loginPasswordVisible = ref(false);
    const newPasswordVisible = ref(false);
    const confirmPasswordVisible = ref(false);
    const activeTab = ref("devices");
    const screenshotTick = ref(0);
    const settingsForm = reactive(loadSettings());
    const settingsFeedback = ref("");

    const state = reactive({
      booting: true,
      authenticated: false,
      requiresPasswordChange: false,
      passwordConfigured: false,
      passwordUpdatedAt: null,
      sessionExpiresAt: null,
      sessionStateText: "正在检查会话",
      loginPassword: "",
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
      loginPending: false,
      changePending: false,
      loginFeedback: "",
      changeFeedback: "",
      devices: [],
      devicesLoading: false,
      devicesError: "",
    });

    let refreshTimer = null;

    const passwordStatusText = computed(() =>
      state.passwordConfigured ? "已更新" : "默认密码",
    );
    const showAuthLayer = computed(() => !state.authenticated);
    const showPasswordChangeModal = computed(
      () => state.requiresPasswordChange && Boolean(state.currentPassword),
    );
    const showLoginModal = computed(
      () => !state.authenticated && !showPasswordChangeModal.value,
    );
    const refreshIntervalMs = computed(
      () => settingsForm.screenshotIntervalSeconds * 1000,
    );

    onMounted(async () => {
      await loadSession();
      restartRefreshLoop();
    });

    onUnmounted(stopRefreshLoop);

    watch(
      () => state.authenticated,
      (authenticated) => {
        if (authenticated) {
          restartRefreshLoop();
          return;
        }

        stopRefreshLoop();
        state.devices = [];
      },
    );

    watch(refreshIntervalMs, () => {
      if (state.authenticated) {
        restartRefreshLoop();
      }
    });

    async function loadSession() {
      state.booting = true;

      try {
        const result = await requestJson("/api/auth/session");
        syncAuthState(result);
        state.sessionStateText = result.authenticated ? "本地会话有效" : "会话缺失或已过期";

        if (result.authenticated) {
          await refreshDevices();
        }
      } catch (error) {
        state.sessionStateText = "认证状态读取失败";
        state.loginFeedback = getErrorMessage(error, "暂时无法检查认证状态。");
      } finally {
        state.booting = false;
      }
    }

    async function submitLogin() {
      if (!state.loginPassword) {
        state.loginFeedback = "请输入登录密码。";
        return;
      }

      state.loginPending = true;
      state.loginFeedback = "";

      try {
        const result = await requestJson("/api/auth/login", {
          method: "POST",
          body: { password: state.loginPassword },
        });

        syncAuthState(result);

        if (result.requiresPasswordChange) {
          state.currentPassword = state.loginPassword;
          state.sessionStateText = "默认密码已通过验证";
          return;
        }

        state.loginPassword = "";
        state.sessionStateText = "已进入控制台";
        await refreshDevices();
        restartRefreshLoop();
      } catch (error) {
        state.sessionStateText = "登录失败";
        state.loginFeedback = getErrorMessage(error, "密码验证失败。");
      } finally {
        state.loginPending = false;
      }
    }

    async function submitPasswordChange() {
      if (!state.currentPassword) {
        state.changeFeedback = "请先使用默认密码登录后再修改。";
        return;
      }

      if (state.nextPassword.length < 6) {
        state.changeFeedback = "新密码至少需要 6 位。";
        return;
      }

      if (state.nextPassword !== state.confirmPassword) {
        state.changeFeedback = "两次输入的新密码不一致。";
        return;
      }

      state.changePending = true;
      state.changeFeedback = "";

      try {
        const result = await requestJson("/api/auth/change-password", {
          method: "POST",
          body: {
            currentPassword: state.currentPassword,
            nextPassword: state.nextPassword,
          },
        });

        syncAuthState(result);
        state.sessionStateText = "密码已更新";
        state.loginPassword = "";
        state.currentPassword = "";
        state.nextPassword = "";
        state.confirmPassword = "";
        await refreshDevices();
        restartRefreshLoop();
      } catch (error) {
        state.changeFeedback = getErrorMessage(error, "密码更新失败。");
      } finally {
        state.changePending = false;
      }
    }

    async function logout() {
      try {
        await requestJson("/api/auth/logout", { method: "POST" });
      } finally {
        state.authenticated = false;
        state.requiresPasswordChange = false;
        state.sessionExpiresAt = null;
        state.sessionStateText = "会话已退出";
        stopRefreshLoop();
        state.devices = [];
      }
    }

    async function refreshDevices() {
      state.devicesLoading = true;
      state.devicesError = "";

      try {
        const result = await requestJson("/api/devices");
        state.devices = result.devices ?? [];
        screenshotTick.value += 1;
      } catch (error) {
        state.devicesError = getErrorMessage(error, "设备列表加载失败。");
      } finally {
        state.devicesLoading = false;
      }
    }

    function screenshotUrl(serial) {
      return `/api/devices/${encodeURIComponent(serial)}/screenshot?t=${screenshotTick.value}`;
    }

    function saveSettingsForm() {
      const normalized = normalizeScreenshotInterval(settingsForm.screenshotIntervalSeconds);
      settingsForm.screenshotIntervalSeconds = normalized;
      saveSettings({ screenshotIntervalSeconds: normalized });
      settingsFeedback.value = `截图将每 ${normalized} 秒刷新一次。`;
      restartRefreshLoop();
    }

    function restartRefreshLoop() {
      stopRefreshLoop();

      if (!state.authenticated) {
        return;
      }

      refreshTimer = window.setInterval(async () => {
        await refreshDevices();
      }, refreshIntervalMs.value);
    }

    function stopRefreshLoop() {
      if (refreshTimer) {
        window.clearInterval(refreshTimer);
        refreshTimer = null;
      }
    }

    function syncAuthState(result) {
      state.authenticated = Boolean(result.authenticated);
      state.requiresPasswordChange = Boolean(result.requiresPasswordChange);
      state.passwordConfigured = Boolean(result.passwordConfigured);
      state.passwordUpdatedAt = result.passwordUpdatedAt;
      state.sessionExpiresAt = result.sessionExpiresAt;
    }

    return {
      activeTab,
      confirmPasswordVisible,
      loginPasswordVisible,
      newPasswordVisible,
      passwordStatusText,
      saveSettingsForm,
      screenshotUrl,
      settingsFeedback,
      settingsForm,
      showAuthLayer,
      showLoginModal,
      showPasswordChangeModal,
      state,
      submitLogin,
      submitPasswordChange,
      logout,
      formatDate,
    };
  },
}).mount("#app");

function formatDate(value) {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
