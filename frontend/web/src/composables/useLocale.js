import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { setI18nLocale } from "../i18n/index.js";
import {
  LOCALE_OPTIONS,
  applyDocumentLocale,
  saveLocale,
} from "../i18n/locale-store.js";

export function useLocale() {
  const { locale, t } = useI18n();

  const currentLocale = computed({
    get: () => locale.value,
    set: (value) => {
      locale.value = value;
      setI18nLocale(value);
      applyDocumentLocale(value);
      saveLocale(value);
    },
  });

  function setLocale(value) {
    currentLocale.value = value;
  }

  return {
    locale: currentLocale,
    localeOptions: LOCALE_OPTIONS,
    setLocale,
    t,
  };
}
