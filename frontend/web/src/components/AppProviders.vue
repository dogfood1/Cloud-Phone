<script setup>
import { computed } from "vue";
import { NConfigProvider, NMessageProvider, darkTheme, lightTheme } from "naive-ui";

import { useTheme } from "../composables/useTheme.js";
import { naiveThemeOverrides } from "../utils/naive-theme.js";

const { theme } = useTheme();

const naiveTheme = computed(() => (theme.value === "dark" ? darkTheme : lightTheme));
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <NMessageProvider>
      <slot />
    </NMessageProvider>
  </NConfigProvider>
</template>
