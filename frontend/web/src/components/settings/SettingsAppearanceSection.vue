<script setup>
import { useI18n } from "vue-i18n";

import ThemeToggle from "../ThemeToggle.vue";
import { useLocale } from "../../composables/useLocale.js";

const { t } = useI18n();
const { locale, localeOptions } = useLocale();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.sections.appearance.title") }}</h3>
    <p class="settings-section__desc">{{ t("settings.sections.appearance.desc") }}</p>

    <dl class="settings-rows">
      <div class="settings-row">
        <dt class="settings-row__label">{{ t("settings.language") }}</dt>
        <dd class="settings-row__control">
          <label class="field field--compact">
            <span class="sr-only">{{ t("settings.language") }}</span>
            <div class="field__control">
              <select
                v-model="locale"
                class="field__select"
                :aria-label="t('settings.language')"
              >
                <option v-for="item in localeOptions" :key="item.code" :value="item.code">
                  {{ item.label }}
                </option>
              </select>
            </div>
          </label>
        </dd>
      </div>
      <div class="settings-row settings-row--stack">
        <dt class="settings-row__label">{{ t("settings.sections.appearance.theme") }}</dt>
        <dd class="settings-row__control">
          <ThemeToggle />
        </dd>
      </div>
    </dl>
    <p class="settings-form__hint">{{ t("settings.languageHint") }}</p>
  </div>
</template>
