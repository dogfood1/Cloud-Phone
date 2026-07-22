<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { NTabPane, NTabs } from "naive-ui";

import "../assets/settings-page.css";
import PageHeader from "./ui/PageHeader.vue";
import SettingsAccountSection from "./settings/SettingsAccountSection.vue";
import SettingsAppearanceSection from "./settings/SettingsAppearanceSection.vue";
import SettingsRefreshSection from "./settings/SettingsRefreshSection.vue";

defineProps({
  settingsForm: {
    type: Object,
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

const activeSectionLabel = computed(() => t(`settings.nav.${activeSection.value}`));
const activeSectionHelp = computed(() => t(`settings.sections.${activeSection.value}.desc`));
</script>

<template>
  <section class="settings-page">
    <PageHeader
      :eyebrow="t('settings.eyebrow')"
      :title="t('settings.title')"
      :help="activeSectionHelp"
      :help-title="activeSectionLabel"
      :meta="activeSectionLabel"
    />

    <NTabs v-model:value="activeSection" type="segment" size="small" class="shell-segment-tabs settings-page__tabs">
      <NTabPane name="account" :tab="t('settings.nav.account')">
        <SettingsAccountSection
          :password-status-text="passwordStatusText"
          :session-expires-at="sessionExpiresAt"
          @change-password="emit('change-password')"
        />
      </NTabPane>
      <NTabPane name="appearance" :tab="t('settings.nav.appearance')">
        <SettingsAppearanceSection />
      </NTabPane>
      <NTabPane name="refresh" :tab="t('settings.nav.refresh')">
        <SettingsRefreshSection :settings-form="settingsForm" @save="emit('save')" />
      </NTabPane>
    </NTabs>
  </section>
</template>
