export const DEFAULT_LOCALE = "zh-CN";

import {
  getCachedSettings,
  hydratePublicPreferencesFromCache,
  persistPublicPreferences,
} from "../utils/local-persistence-state.js";

/** @type {{ code: string; label: string }[]} */
export const LOCALE_OPTIONS = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en-US", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
];

const SUPPORTED_CODES = new Set(LOCALE_OPTIONS.map((item) => item.code));

export function isSupportedLocale(locale) {
  return SUPPORTED_CODES.has(locale);
}

export function getStoredLocale() {
  const stored = hydratePublicPreferencesFromCache().locale ?? getCachedSettings().locale;
  if (stored && isSupportedLocale(stored)) {
    return stored;
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale) {
  if (!isSupportedLocale(locale)) {
    return;
  }
  void persistPublicPreferences({ locale });
}

export function applyDocumentLocale(locale) {
  const resolved = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  document.documentElement.lang = resolved;
  return resolved;
}

export function initLocale() {
  return applyDocumentLocale(getStoredLocale());
}
