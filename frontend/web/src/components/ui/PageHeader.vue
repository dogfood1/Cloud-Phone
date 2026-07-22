<script setup>
import HelpHint from "./HelpHint.vue";

defineProps({
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  help: {
    type: String,
    default: "",
  },
  helpTitle: {
    type: String,
    default: "",
  },
  meta: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <p v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
      <div class="page-header__title-row">
        <h2 class="page-header__title">{{ title }}</h2>
        <HelpHint v-if="help" :content="help" :title="helpTitle || title" />
      </div>
      <p v-if="meta" class="page-header__meta">{{ meta }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
