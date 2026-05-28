import { computed, reactive, ref } from "vue";

import { i18n } from "../i18n/index.js";
import {
  clearSessionEncryptionKey,
  changePasswordRequest,
  getErrorMessage,
  hasSessionEncryptionKey,
  loginRequest,
  requestJson,
} from "../utils/api.js";

function t(key, params) {
  return i18n.global.t(key, params);
}

export function useAuth() {
  const state = reactive({
    booting: true,
    authenticated: false,
    requiresPasswordChange: false,
    passwordConfigured: false,
    passwordUpdatedAt: null,
    sessionExpiresAt: null,
    sessionStateText: "",
    loginPassword: "",
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

  const passwordStatusText = computed(() =>
    state.passwordConfigured ? t("auth.passwordUpdated") : t("auth.passwordDefault"),
  );
  const showAuthLayer = computed(() => !state.authenticated);
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

    try {
      const result = await requestJson("/api/auth/session");

      if (result.authenticated && !hasSessionEncryptionKey()) {
        syncAuthState({ ...result, authenticated: false });
        clearSessionEncryptionKey();
        state.sessionStateText = t("auth.sessionMissing");
        return false;
      }

      syncAuthState(result);
      state.sessionStateText = result.authenticated
        ? t("auth.sessionValid")
        : t("auth.sessionMissing");
      return result.authenticated;
    } catch (error) {
      state.sessionStateText = t("auth.sessionReadFailed");
      state.loginFeedback = getErrorMessage(error, t("auth.sessionCheckFailed"));
      return false;
    } finally {
      state.booting = false;
    }
  }

  async function submitLogin() {
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
        state.currentPassword = state.loginPassword;
        state.sessionStateText = t("auth.defaultVerified");
        return false;
      }

      state.loginPassword = "";
      state.sessionStateText = t("auth.enteredConsole");
      return true;
    } catch (error) {
      state.sessionStateText = t("auth.loginFailed");
      state.loginFeedback = getErrorMessage(error, t("auth.loginFailedDefault"));
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
      const result = await changePasswordRequest({
        currentPassword: state.currentPassword,
        nextPassword: state.nextPassword,
      });

      syncAuthState(result);
      state.sessionStateText = t("auth.passwordChanged");
      state.loginPassword = "";
      state.currentPassword = "";
      state.nextPassword = "";
      state.confirmPassword = "";
      passwordChangeDialogOpen.value = false;
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
    passwordChangeMode,
    loadSession,
    submitLogin,
    submitPasswordChange,
    openPasswordChange,
    closePasswordChange,
    logout,
  };
}
