<script setup>
import { computed } from "vue";
import { NConfigProvider, NMessageProvider, darkTheme, lightTheme } from "naive-ui";

import { useTheme } from "../composables/useTheme.js";
import { naiveThemeOverrides } from "../utils/naive-theme.js";

const { theme } = useTheme();

const naiveTheme = computed(() => (theme.value === "dark" ? darkTheme : lightTheme));

const messagePlacement = "top";
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <NMessageProvider :placement="messagePlacement" :max="4" keep-alive-on-hover>
      <slot />
    </NMessageProvider>
  </NConfigProvider>
</template>
