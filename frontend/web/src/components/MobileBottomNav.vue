<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";

const props = defineProps({
  activeTab: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:activeTab"]);

const { t } = useI18n();

const tabs = computed(() => [
  { id: "devices", label: t("sidebar.devices"), icon: "devices" },
  { id: "group-control", label: t("sidebar.groupControl"), icon: "group-control" },
  { id: "logs", label: t("sidebar.logs"), icon: "logs" },
  { id: "settings", label: t("sidebar.settings"), icon: "settings" },
]);
</script>

<template>
  <nav class="mobile-bottom-nav" :aria-label="t('sidebar.navLabel')">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="mobile-bottom-nav__item"
      :class="{ 'mobile-bottom-nav__item--active': props.activeTab === tab.id }"
      @click="emit('update:activeTab', tab.id)"
    >
      <AppIcon :name="tab.icon" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
