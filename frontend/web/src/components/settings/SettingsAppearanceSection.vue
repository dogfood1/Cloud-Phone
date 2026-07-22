<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NSelect } from "naive-ui";

import HelpHint from "../ui/HelpHint.vue";
import ThemeToggle from "../ThemeToggle.vue";
import { useLocale } from "../../composables/useLocale.js";

const { t } = useI18n();
const { locale, localeOptions } = useLocale();

const languageOptions = computed(() =>
  localeOptions.map((item) => ({ label: item.label, value: item.code })),
);
</script>

<template>
  <div class="settings-section shell-panel-content">
    <dl class="shell-form-rows">
      <div class="shell-form-row">
        <dt class="shell-form-row__label">
          <span class="form-label-row">
            {{ t("settings.language") }}
            <HelpHint :content="t('settings.languageHint')" :title="t('settings.language')" size="sm" />
          </span>
        </dt>
        <dd class="shell-form-row__control">
          <NSelect v-model:value="locale" :options="languageOptions" size="small" />
        </dd>
      </div>
      <div class="shell-form-row shell-form-row--stack">
        <dt class="shell-form-row__label">{{ t("settings.sections.appearance.theme") }}</dt>
        <dd class="shell-form-row__control">
          <ThemeToggle />
        </dd>
      </div>
    </dl>
  </div>
</template>
