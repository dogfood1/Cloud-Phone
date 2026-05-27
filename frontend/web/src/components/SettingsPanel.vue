<script setup>
import { useI18n } from "vue-i18n";

import { useLocale } from "../composables/useLocale.js";
import { formatDate } from "../utils/format-date.js";

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

defineEmits(["save"]);

const { t } = useI18n();
const { locale, localeOptions } = useLocale();
</script>

<template>
  <section class="settings-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("settings.eyebrow") }}</p>
        <h2>{{ t("settings.title") }}</h2>
        <p class="panel-header__desc">{{ t("settings.desc") }}</p>
      </div>
    </header>
    <form class="settings-form settings-card" @submit.prevent="$emit('save')">
      <label class="field">
        <span>{{ t("settings.language") }}</span>
        <div class="field__control">
          <select v-model="locale" class="field__select" :aria-label="t('settings.language')">
            <option v-for="item in localeOptions" :key="item.code" :value="item.code">
              {{ item.label }}
            </option>
          </select>
        </div>
      </label>
      <p class="settings-form__hint">{{ t("settings.languageHint") }}</p>

      <label class="field">
        <span>{{ t("settings.deviceInterval") }}</span>
        <div class="field__control">
          <input
            v-model.number="settingsForm.deviceListIntervalSeconds"
            type="number"
            min="1"
            max="120"
            step="1"
            required
          />
        </div>
      </label>
      <label class="field">
        <span>{{ t("settings.screenshotInterval") }}</span>
        <div class="field__control">
          <input
            v-model.number="settingsForm.screenshotIntervalSeconds"
            type="number"
            min="1"
            max="120"
            step="1"
            required
          />
        </div>
      </label>
      <p class="settings-form__hint">{{ t("settings.intervalHint") }}</p>
      <p v-if="settingsFeedback" class="feedback">{{ settingsFeedback }}</p>
      <button class="primary-button" type="submit">{{ t("settings.save") }}</button>
    </form>
    <dl class="settings-meta">
      <div>
        <dt>{{ t("settings.passwordStatus") }}</dt>
        <dd>{{ passwordStatusText }}</dd>
      </div>
      <div>
        <dt>{{ t("settings.sessionExpiry") }}</dt>
        <dd>{{ formatDate(sessionExpiresAt) }}</dd>
      </div>
    </dl>
  </section>
</template>
