<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import "../assets/settings-page.css";
import AppIcon from "./AppIcon.vue";
import SettingsAccountSection from "./settings/SettingsAccountSection.vue";
import SettingsAppearanceSection from "./settings/SettingsAppearanceSection.vue";
import SettingsRefreshSection from "./settings/SettingsRefreshSection.vue";

defineProps({
  settingsForm: {
    type: Object,
    required: true,
  },
  settingsFeedback: {
    type: String,
    required: true,
  },
  passwordStatusText: {
    type: String,
    required: true,
  },
  sessionExpiresAt: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["save", "change-password"]);

const { t } = useI18n();
const activeSection = ref("account");

const sections = [
  { id: "account", icon: "user" },
  { id: "appearance", icon: "palette" },
  { id: "refresh", icon: "refresh" },
];
</script>

<template>
  <section class="settings-page">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("settings.eyebrow") }}</p>
        <h2>{{ t("settings.title") }}</h2>
        <p class="panel-header__desc">{{ t("settings.desc") }}</p>
      </div>
    </header>

    <div class="settings-page__body">
      <nav class="settings-page__nav" :aria-label="t('settings.navLabel')">
        <button
          v-for="item in sections"
          :key="item.id"
          type="button"
          class="settings-page__nav-btn"
          :class="{ 'settings-page__nav-btn--active': activeSection === item.id }"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          @click="activeSection = item.id"
        >
          <AppIcon :name="item.icon" />
          <span>{{ t(`settings.nav.${item.id}`) }}</span>
        </button>
      </nav>

      <div class="settings-page__content">
        <SettingsAccountSection
          v-if="activeSection === 'account'"
          :password-status-text="passwordStatusText"
          :session-expires-at="sessionExpiresAt"
          @change-password="emit('change-password')"
        />
        <SettingsAppearanceSection v-else-if="activeSection === 'appearance'" />
        <SettingsRefreshSection
          v-else
          :settings-form="settingsForm"
          :settings-feedback="settingsFeedback"
          @save="emit('save')"
        />
      </div>
    </div>
  </section>
</template>
