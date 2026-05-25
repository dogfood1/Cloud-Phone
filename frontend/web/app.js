const { createApp, computed, onMounted, reactive, ref } = Vue;

createApp({
  setup() {
    const loginPasswordVisible = ref(false);
    const newPasswordVisible = ref(false);
    const confirmPasswordVisible = ref(false);
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
    });

    const passwordStatusText = computed(() =>
      state.passwordConfigured ? "已更新" : "默认密码",
    );
    const passwordStatusTip = computed(() =>
      state.passwordConfigured
        ? `最近修改：${formatDate(state.passwordUpdatedAt)}`
        : "首次登录后将强制进入改密流程",
    );
    const showAuthLayer = computed(() => !state.authenticated);

    onMounted(loadSession);

    async function loadSession() {
      state.booting = true;

      try {
        const result = await requestJson("/api/auth/session");
        syncAuthState(result);
        state.sessionStateText = result.authenticated ? "本地会话有效" : "会话缺失或已过期";
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
      } catch (error) {
        state.sessionStateText = "登录失败";
        state.loginFeedback = getErrorMessage(error, "密码验证失败。");
      } finally {
        state.loginPending = false;
      }
    }

    async function submitPasswordChange() {
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
      confirmPasswordVisible,
      loginPasswordVisible,
      newPasswordVisible,
      passwordStatusText,
      passwordStatusTip,
      showAuthLayer,
      state,
      submitLogin,
      submitPasswordChange,
      logout,
      formatDate,
    };
  },
}).mount("#app");

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message ?? "Request failed.");
  }

  return result;
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

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
