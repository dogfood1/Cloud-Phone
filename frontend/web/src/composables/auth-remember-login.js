import {
  clearRememberedPassword,
  getRememberedPassword,
  isRememberPasswordEnabled,
  setRememberedPassword,
} from "../utils/remembered-password.js";

/**
 * @param {{
 *   state: { authenticated: boolean, rememberPassword: boolean, loginPassword: string },
 *   submitLogin: (options?: { fromRemember?: boolean }) => Promise<boolean>,
 * }} deps
 */
export function createRememberLoginController({ state, submitLogin }) {
  let autoLoginAttempted = false;

  function resetAutoLogin() {
    autoLoginAttempted = false;
  }

  function skipAutoLoginOnce() {
    autoLoginAttempted = true;
  }

  function prefillRememberedPassword() {
    state.rememberPassword = isRememberPasswordEnabled();
    if (state.rememberPassword && !state.loginPassword) {
      state.loginPassword = getRememberedPassword();
    }
  }

  /**
   * @param {{ manageBooting?: boolean }} [options]
   */
  async function runRememberedLogin(options = {}) {
    if (autoLoginAttempted || state.authenticated) {
      prefillRememberedPassword();
      return false;
    }

    const remembered = getRememberedPassword();
    if (!remembered) {
      prefillRememberedPassword();
      return false;
    }

    autoLoginAttempted = true;
    state.rememberPassword = true;
    state.loginPassword = remembered;

    if (options.manageBooting) {
      state.booting = true;
    }

    try {
      return await submitLogin({ fromRemember: true });
    } finally {
      if (options.manageBooting) {
        state.booting = false;
      }
    }
  }

  function persistRememberedPassword(password) {
    if (state.rememberPassword) {
      setRememberedPassword(true, password);
      return;
    }
    clearRememberedPassword();
  }

  function clearOnInvalidRemembered() {
    clearRememberedPassword();
    state.rememberPassword = false;
    state.loginPassword = "";
  }

  function syncAfterPasswordChange(nextPassword) {
    if (isRememberPasswordEnabled() || state.rememberPassword) {
      setRememberedPassword(true, nextPassword);
      state.rememberPassword = true;
    }
  }

  return {
    resetAutoLogin,
    skipAutoLoginOnce,
    prefillRememberedPassword,
    runRememberedLogin,
    persistRememberedPassword,
    clearOnInvalidRemembered,
    syncAfterPasswordChange,
  };
}
