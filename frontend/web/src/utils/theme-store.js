export const THEMES = ["dark", "light"];

import {
  getCachedSettings,
  hydratePublicPreferencesFromCache,
  persistPublicPreferences,
} from "./local-persistence-state.js";

export function getStoredTheme() {
  const stored = hydratePublicPreferencesFromCache().theme ?? getCachedSettings().theme;
  return THEMES.includes(stored) ? stored : "light";
}

export function applyTheme(theme) {
  const resolvedTheme = THEMES.includes(theme) ? theme : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  return resolvedTheme;
}

export function saveTheme(theme) {
  void persistPublicPreferences({ theme });
}

export function initTheme() {
  return applyTheme(getStoredTheme());
}
