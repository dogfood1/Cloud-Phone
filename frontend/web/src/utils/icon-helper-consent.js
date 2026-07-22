const CONSENT_PREFIX = "cloud-phone.icon-helper.consent.";
const DENY_COUNT_PREFIX = "cloud-phone.icon-helper.deny-count.";
const FIRST_SETUP_PREFIX = "cloud-phone.icon-helper.first-setup.";
const PREFERENCE_KEY = "cloud-phone.icon-helper.preference";

const MAX_DENY_PROMPTS = 2;

/**
 * @param {string} serial
 */
function consentKey(serial) {
  return `${CONSENT_PREFIX}${serial}`;
}

/**
 * @param {string} serial
 */
function denyCountKey(serial) {
  return `${DENY_COUNT_PREFIX}${serial}`;
}

/**
 * @param {string} serial
 */
function firstSetupKey(serial) {
  return `${FIRST_SETUP_PREFIX}${serial}`;
}

/**
 * Global preference: ask | allow | never
 * @returns {"ask" | "allow" | "never"}
 */
export function getIconHelperPreference() {
  const value = localStorage.getItem(PREFERENCE_KEY);
  if (value === "allow" || value === "never" || value === "ask") {
    return value;
  }
  return "ask";
}

/**
 * @param {"ask" | "allow" | "never"} preference
 */
export function setIconHelperPreference(preference) {
  if (preference !== "ask" && preference !== "allow" && preference !== "never") {
    return;
  }

  localStorage.setItem(PREFERENCE_KEY, preference);

  if (preference === "ask") {
    clearAllSerialDenials();
  }
}

/**
 * @param {string} serial
 * @returns {"allowed" | "denied" | null}
 */
export function getSerialIconHelperConsent(serial) {
  if (!serial) {
    return null;
  }
  const value = localStorage.getItem(consentKey(serial));
  if (value === "allowed" || value === "denied") {
    return value;
  }
  return null;
}

/**
 * Effective consent after applying global preference.
 * @param {string} serial
 * @returns {"allowed" | "denied" | null} null means should prompt
 */
export function resolveIconHelperConsent(serial) {
  const preference = getIconHelperPreference();
  if (preference === "allow") {
    return "allowed";
  }
  if (preference === "never") {
    return "denied";
  }
  return getSerialIconHelperConsent(serial);
}

/**
 * @param {string} serial
 */
export function setSerialIconHelperAllowed(serial) {
  if (!serial) {
    return;
  }
  localStorage.setItem(consentKey(serial), "allowed");
  localStorage.removeItem(denyCountKey(serial));
}

/**
 * Record a denial. After 2 denials, marks serial as permanently denied (until settings reset).
 * @param {string} serial
 * @returns {{ denyCount: number, permanentlyDenied: boolean }}
 */
export function recordSerialIconHelperDenial(serial) {
  if (!serial) {
    return { denyCount: 0, permanentlyDenied: false };
  }

  const next = Math.min(MAX_DENY_PROMPTS, getSerialDenyCount(serial) + 1);
  localStorage.setItem(denyCountKey(serial), String(next));

  if (next >= MAX_DENY_PROMPTS) {
    localStorage.setItem(consentKey(serial), "denied");
    return { denyCount: next, permanentlyDenied: true };
  }

  localStorage.removeItem(consentKey(serial));
  return { denyCount: next, permanentlyDenied: false };
}

/**
 * @param {string} serial
 */
export function getSerialDenyCount(serial) {
  if (!serial) {
    return 0;
  }
  const raw = Number.parseInt(localStorage.getItem(denyCountKey(serial)) || "0", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/**
 * First successful extract completed for this device (progress modal only once).
 * @param {string} serial
 */
export function isIconHelperFirstSetupDone(serial) {
  if (!serial) {
    return false;
  }
  return localStorage.getItem(firstSetupKey(serial)) === "1";
}

/**
 * @param {string} serial
 */
export function markIconHelperFirstSetupDone(serial) {
  if (!serial) {
    return;
  }
  localStorage.setItem(firstSetupKey(serial), "1");
}

function clearAllSerialDenials() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) {
      continue;
    }
    if (
      key.startsWith(CONSENT_PREFIX)
      || key.startsWith(DENY_COUNT_PREFIX)
      || key.startsWith(FIRST_SETUP_PREFIX)
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
