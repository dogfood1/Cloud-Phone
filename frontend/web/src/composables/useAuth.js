import { computed, reactive } from "vue";

import { getErrorMessage, requestJson } from "../utils/api.js";

export function useAuth() {
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
  const showAuthLayer = computed(() => !state.authenticated);
  const showPasswordChangeModal = computed(
    () => state.requiresPasswordChange && Boolean(state.currentPassword),
  );
  const showLoginModal = computed(
    () => !state.authenticated && !showPasswordChangeModal.value,
  );

  async function loadSession() {
    state.booting = true;

    try {
      const result = await requestJson("/api/auth/session");
      syncAuthState(result);
      state.sessionStateText = result.authenticated ? "本地会话有效" : "会话缺失或已过期";
      return result.authenticated;
    } catch (error) {
      state.sessionStateText = "认证状态读取失败";
      state.loginFeedback = getErrorMessage(error, "暂时无法检查认证状态。");
      return false;
    } finally {
      state.booting = false;
    }
  }

  async function submitLogin() {
    if (!state.loginPassword) {
      state.loginFeedback = "请输入登录密码。";
      return false;
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
        return false;
      }

      state.loginPassword = "";
      state.sessionStateText = "已进入控制台";
      return true;
    } catch (error) {
      state.sessionStateText = "登录失败";
      state.loginFeedback = getErrorMessage(error, "密码验证失败。");
      return false;
    } finally {
      state.loginPending = false;
    }
  }

  async function submitPasswordChange() {
    if (!state.currentPassword) {
      state.changeFeedback = "请先使用默认密码登录后再修改。";
      return false;
    }

    if (state.nextPassword.length < 6) {
      state.changeFeedback = "新密码至少需要 6 位。";
      return false;
    }

    if (state.nextPassword !== state.confirmPassword) {
      state.changeFeedback = "两次输入的新密码不一致。";
      return false;
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
      return true;
    } catch (error) {
      state.changeFeedback = getErrorMessage(error, "密码更新失败。");
      return false;
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
    state,
    passwordStatusText,
    showAuthLayer,
    showLoginModal,
    showPasswordChangeModal,
    loadSession,
    submitLogin,
    submitPasswordChange,
    logout,
  };
}
