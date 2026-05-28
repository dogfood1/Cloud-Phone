<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import ThemeToggle from "./ThemeToggle.vue";
const props = defineProps({
  activeTab: {
    type: String,
    required: true,
  },
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:activeTab", "logout"]);

const { t } = useI18n();

const tabs = computed(() => [
  { id: "devices", label: t("sidebar.devices"), icon: "devices" },
  { id: "settings", label: t("sidebar.settings"), icon: "settings" },
]);
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--mobile-open': mobileOpen }">
    <div class="sidebar__brand">
      <div class="sidebar__logo" aria-hidden="true">
        <AppIcon name="phone" />
      </div>
      <div>
        <p class="eyebrow">Cloud Phone</p>
        <strong>{{ t("sidebar.brandTitle") }}</strong>
      </div>
    </div>

    <nav class="sidebar__tabs" :aria-label="t('sidebar.navLabel')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="sidebar__tab"
        :class="{ 'sidebar__tab--active': props.activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        <AppIcon :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="sidebar__footer">
      <ThemeToggle />
      <button type="button" class="sidebar__logout" @click="emit('logout')">
        <AppIcon name="logout" />
        <span>{{ t("sidebar.logout") }}</span>
      </button>
    </div>
  </aside>
</template>
