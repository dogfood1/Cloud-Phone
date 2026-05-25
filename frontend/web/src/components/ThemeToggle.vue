<script setup>
import AppIcon from "./AppIcon.vue";
import { useTheme } from "../composables/useTheme.js";

const { theme, setTheme } = useTheme();
</script>

<template>
  <div class="theme-toggle" role="group" aria-label="外观模式">
    <button
      type="button"
      class="theme-toggle__option"
      :class="{ 'theme-toggle__option--active': theme === 'light' }"
      @click="setTheme('light')"
    >
      <AppIcon name="sun" />
      <span>浅色</span>
    </button>
    <button
      type="button"
      class="theme-toggle__option"
      :class="{ 'theme-toggle__option--active': theme === 'dark' }"
      @click="setTheme('dark')"
    >
      <AppIcon name="moon" />
      <span>深色</span>
    </button>
  </div>
</template>
