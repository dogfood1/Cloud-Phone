<script setup>
import { NTabs, NTab } from "naive-ui";

defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: "",
  },
});

const activeTab = defineModel({ type: String, required: true });
</script>

<template>
  <NTabs
    v-model:value="activeTab"
    type="segment"
    size="small"
    class="shell-segment-tabs"
    :aria-label="ariaLabel"
  >
    <NTab v-for="tab in tabs" :key="tab.name" :name="tab.name">
      <span class="shell-segment-tabs__label">
        <component :is="tab.icon" v-if="tab.icon" class="shell-segment-tabs__icon" />
        <span>{{ tab.label }}</span>
        <span v-if="tab.count != null" class="shell-segment-tabs__count">{{ tab.count }}</span>
      </span>
    </NTab>
  </NTabs>
</template>
