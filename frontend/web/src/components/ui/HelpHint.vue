<script setup>
import { NPopover } from "naive-ui";
import { HelpCircle } from "lucide-vue-next";

defineProps({
  content: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  placement: {
    type: String,
    default: "top",
  },
  size: {
    type: String,
    default: "md",
  },
});
</script>

<template>
  <NPopover trigger="click" :placement="placement" :show-arrow="true" raw>
    <template #trigger>
      <button
        type="button"
        class="help-hint"
        :class="`help-hint--${size}`"
        :aria-label="title || content"
      >
        <HelpCircle aria-hidden="true" />
      </button>
    </template>
    <div class="help-hint__panel">
      <p v-if="title" class="help-hint__title">{{ title }}</p>
      <p class="help-hint__content">{{ content }}</p>
    </div>
  </NPopover>
</template>
