const REMEMBER_ENABLED_KEY = "cloud-phone.auth.rememberPassword";
const REMEMBER_PASSWORD_KEY = "cloud-phone.auth.rememberedPassword";

export function isRememberPasswordEnabled() {
  return localStorage.getItem(REMEMBER_ENABLED_KEY) === "1";
}

export function getRememberedPassword() {
  if (!isRememberPasswordEnabled()) {
    return "";
  }

  return String(localStorage.getItem(REMEMBER_PASSWORD_KEY) || "");
}

/**
 * @param {boolean} enabled
 * @param {string} [password]
 */
export function setRememberedPassword(enabled, password = "") {
  if (!enabled) {
    clearRememberedPassword();
    return;
  }

  localStorage.setItem(REMEMBER_ENABLED_KEY, "1");
  localStorage.setItem(REMEMBER_PASSWORD_KEY, String(password || ""));
}

export function clearRememberedPassword() {
  localStorage.removeItem(REMEMBER_ENABLED_KEY);
  localStorage.removeItem(REMEMBER_PASSWORD_KEY);
}
