import { computed, reactive, ref } from "vue";

import { i18n } from "../i18n/index.js";
import {
  clearSessionEncryptionKey,
  changePasswordRequest,
  getErrorMessage,
  loginRequest,
  requestJson,
} from "../utils/api.js";
import { registerSessionExpiredHandler, resetSessionExpiredGate } from "../utils/auth-session-bridge.js";
import { logInfo, logWarn } from "../utils/app-event-logger.js";
import { isRememberPasswordEnabled } from "../utils/remembered-password.js";
import { createRememberLoginController } from "./auth-remember-login.js";
import {
  createCookieSessionRestorer,
  softRecoverSession,
} from "./auth-session-recover.js";

function t(key, params) {
  return i18n.global.t(key, params);
}

export function useAuth() {
  const state = reactive({
    booting: true,
    reauthenticating: false,
    authenticated: false,
    requiresPasswordChange: false,
    passwordConfigured: false,
    passwordUpdatedAt: null,
    sessionExpiresAt: null,
    sessionStateText: "",
    loginPassword: "",
    rememberPassword: isRememberPasswordEnabled(),
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
    loginPending: false,
    changePending: false,
    loginFeedback: "",
    changeFeedback: "",
  });

  state.sessionStateText = t("auth.sessionChecking");

  const passwordChangeDialogOpen = ref(false);

  function syncAuthState(result) {
    state.authenticated = Boolean(result.authenticated);
    state.requiresPasswordChange = Boolean(result.requiresPasswordChange);
    state.passwordConfigured = Boolean(result.passwordConfigured);
    state.passwordUpdatedAt = result.passwordUpdatedAt;
    state.sessionExpiresAt = result.sessionExpiresAt;
  }

  const remember = createRememberLoginController({
    state,
    submitLogin: (options) => submitLogin(options),
  });

  const tryRestoreFromCookie = createCookieSessionRestorer({
    syncAuthState,
    sessionValidText: t("auth.sessionValid"),
  });

  registerSessionExpiredHandler(() => {
    void softRecoverSession({
      state,
      remember,
      tryRestoreFromCookie,
      texts: {
        sessionChecking: t("auth.sessionChecking"),
        sessionMissing: t("auth.sessionMissing"),
        sessionValid: t("auth.sessionValid"),
      },
      logWarn,
    });
  });

  const passwordStatusText = computed(() =>
    state.passwordConfigured ? t("auth.passwordUpdated") : t("auth.passwordDefault"),
  );
  const showAuthLayer = computed(
    () => !state.authenticated && !state.booting && !state.reauthenticating,
  );
  const showForcedPasswordChangeModal = computed(
    () => state.requiresPasswordChange && Boolean(state.currentPassword),
  );
  const showPasswordChangeModal = computed(
    () => showForcedPasswordChangeModal.value || passwordChangeDialogOpen.value,
  );
  const passwordChangeMode = computed(() =>
    showForcedPasswordChangeModal.value ? "forced" : "voluntary",
  );
  const showLoginModal = computed(
    () => !state.authenticated && !showPasswordChangeModal.value,
  );

  async function loadSession() {
    state.booting = true;
    remember.resetAutoLogin();

    try {
      const restored = await tryRestoreFromCookie();
      if (restored) {
        state.sessionStateText = t("auth.sessionValid");
        resetSessionExpiredGate();
        logInfo("auth", "auth.session.restore", "通过 Cookie 恢复登录会话", {
          details: { sessionExpiresAt: restored.result.sessionExpiresAt },
        });
        return true;
      }

      clearSessionEncryptionKey();
      syncAuthState({
        authenticated: false,
        requiresPasswordChange: false,
        passwordConfigured: false,
      });
      state.sessionStateText = t("auth.sessionMissing");
      return await remember.runRememberedLogin();
    } catch (error) {
      state.sessionStateText = t("auth.sessionReadFailed");
      state.loginFeedback = getErrorMessage(error, t("auth.sessionCheckFailed"));
      return await remember.runRememberedLogin();
    } finally {
      state.booting = false;
    }
  }

  /**
   * @param {{ fromRemember?: boolean }} [options]
   */
  async function submitLogin(options = {}) {
    const fromRemember = Boolean(options.fromRemember);

    if (!state.loginPassword) {
      state.loginFeedback = t("auth.enterPassword");
      return false;
    }

    state.loginPending = true;
    state.loginFeedback = "";

    try {
      const result = await loginRequest(state.loginPassword);
      syncAuthState(result);

      if (result.requiresPasswordChange) {
        clearSessionEncryptionKey();
        state.currentPassword = state.loginPassword;
        state.sessionStateText = t("auth.defaultVerified");
        remember.persistRememberedPassword(state.loginPassword);
        return false;
      }

      remember.persistRememberedPassword(state.loginPassword);
      state.loginPassword = "";
      state.sessionStateText = t("auth.enteredConsole");
      resetSessionExpiredGate();
      logInfo(
        "auth",
        "auth.login.success",
        fromRemember ? "记住密码自动登录成功" : "登录成功",
      );
      return true;
    } catch (error) {
      if (fromRemember) {
        remember.clearOnInvalidRemembered();
        state.loginFeedback = t("auth.rememberedPasswordInvalid");
        state.sessionStateText = t("auth.sessionMissing");
        logWarn("auth", "auth.login.remembered_failed", "记住的密码已失效，需重新登录");
        return false;
      }

      state.sessionStateText = t("auth.loginFailed");
      state.loginFeedback = getErrorMessage(error, t("auth.loginFailedDefault"));
      logWarn("auth", "auth.login.failed", "登录失败", {
        details: { error: getErrorMessage(error, t("auth.loginFailedDefault")) },
      });
      return false;
    } finally {
      state.loginPending = false;
    }
  }

  async function submitPasswordChange() {
    if (!state.currentPassword) {
      state.changeFeedback = t("auth.changeNeedLogin");
      return false;
    }

    if (state.nextPassword.length < 6) {
      state.changeFeedback = t("auth.passwordTooShort");
      return false;
    }

    if (state.nextPassword !== state.confirmPassword) {
      state.changeFeedback = t("auth.passwordMismatch");
      return false;
    }

    state.changePending = true;
    state.changeFeedback = "";

    try {
      const result = await changePasswordRequest(
        {
          currentPassword: state.currentPassword,
          nextPassword: state.nextPassword,
        },
        { plainJson: state.requiresPasswordChange },
      );

      syncAuthState(result);
      state.sessionStateText = t("auth.passwordChanged");
      remember.syncAfterPasswordChange(state.nextPassword);
      state.loginPassword = "";
      state.currentPassword = "";
      state.nextPassword = "";
      state.confirmPassword = "";
      passwordChangeDialogOpen.value = false;
      resetSessionExpiredGate();
      logInfo("auth", "auth.password.change", "修改密码成功");
      return true;
    } catch (error) {
      state.changeFeedback = getErrorMessage(error, t("auth.changeFailedDefault"));
      return false;
    } finally {
      state.changePending = false;
    }
  }

  function openPasswordChange() {
    if (!state.authenticated) {
      return;
    }

    state.nextPassword = "";
    state.confirmPassword = "";
    state.changeFeedback = "";

    if (!state.requiresPasswordChange) {
      state.currentPassword = "";
    }

    passwordChangeDialogOpen.value = true;
  }

  function closePasswordChange() {
    if (state.requiresPasswordChange) {
      return;
    }

    passwordChangeDialogOpen.value = false;
    state.currentPassword = "";
    state.nextPassword = "";
    state.confirmPassword = "";
    state.changeFeedback = "";
  }

  async function logout() {
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
    } finally {
      clearSessionEncryptionKey();
      state.authenticated = false;
      state.requiresPasswordChange = false;
      state.sessionExpiresAt = null;
      state.sessionStateText = t("auth.sessionLoggedOut");
      remember.skipAutoLoginOnce();
      remember.prefillRememberedPassword();
      logInfo("auth", "auth.logout.done", "已退出登录");
    }
  }

  return {
    state,
    passwordStatusText,
    showAuthLayer,
    showLoginModal,
    showPasswordChangeModal,
    passwordChangeMode,
    loadSession,
    submitLogin,
    submitPasswordChange,
    openPasswordChange,
    closePasswordChange,
    logout,
  };
}
