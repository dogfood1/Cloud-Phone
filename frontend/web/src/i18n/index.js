import { createI18n } from "vue-i18n";

import messages from "./messages/index.js";
import { DEFAULT_LOCALE, getStoredLocale } from "./locale-store.js";

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
});

export function setI18nLocale(locale) {
  i18n.global.locale.value = locale;
}
