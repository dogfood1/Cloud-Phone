import { computed, ref } from "vue";

import { applyTheme, getStoredTheme, saveTheme } from "../utils/theme-store.js";

const theme = ref(initThemeState());

function initThemeState() {
  return applyTheme(getStoredTheme());
}

export function useTheme() {
  const isDark = computed(() => theme.value === "dark");
  const isLight = computed(() => theme.value === "light");

  function setTheme(nextTheme) {
    theme.value = applyTheme(nextTheme);
    saveTheme(theme.value);
  }

  return {
    theme,
    isDark,
    isLight,
    setTheme,
  };
}
