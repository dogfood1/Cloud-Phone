<script setup>
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import { useTheme } from "../composables/useTheme.js";

const { theme, setTheme } = useTheme();
const { t } = useI18n();
</script>

<template>
  <div class="theme-toggle" role="group" :aria-label="t('theme.ariaLabel')">
    <button
      type="button"
      class="theme-toggle__option"
      :class="{ 'theme-toggle__option--active': theme === 'light' }"
      @click="setTheme('light')"
    >
      <AppIcon name="sun" />
      <span>{{ t("theme.light") }}</span>
    </button>
    <button
      type="button"
      class="theme-toggle__option"
      :class="{ 'theme-toggle__option--active': theme === 'dark' }"
      @click="setTheme('dark')"
    >
      <AppIcon name="moon" />
      <span>{{ t("theme.dark") }}</span>
    </button>
  </div>
</template>
