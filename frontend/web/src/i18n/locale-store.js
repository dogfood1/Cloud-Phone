export const LOCALE_STORAGE_KEY = "cloud-phone-locale";
export const DEFAULT_LOCALE = "zh-CN";

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
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isSupportedLocale(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  return DEFAULT_LOCALE;
}

export function saveLocale(locale) {
  if (!isSupportedLocale(locale)) {
    return;
  }

  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function applyDocumentLocale(locale) {
  const resolved = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  document.documentElement.lang = resolved;
  return resolved;
}

export function initLocale() {
  return applyDocumentLocale(getStoredLocale());
}
