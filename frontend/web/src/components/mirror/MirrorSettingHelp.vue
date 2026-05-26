<script setup>
import { NButton, NTooltip } from "naive-ui";

defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <NTooltip trigger="hover" :style="{ maxWidth: '18rem' }">
    <template #trigger>
      <NButton
        circle
        quaternary
        size="tiny"
        :aria-label="`说明：${text}`"
        style="flex-shrink: 0"
      >
        ?
      </NButton>
    </template>
    {{ text }}
  </NTooltip>
</template>
