<script setup>
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
      浅色
    </button>
    <button
      type="button"
      class="theme-toggle__option"
      :class="{ 'theme-toggle__option--active': theme === 'dark' }"
      @click="setTheme('dark')"
    >
      深色
    </button>
  </div>
</template>
