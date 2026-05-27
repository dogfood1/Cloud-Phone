<script setup>
import { useI18n } from "vue-i18n";

import { formatDate } from "../../utils/format-date.js";

defineProps({
  passwordStatusText: {
    type: String,
    required: true,
  },
  sessionExpiresAt: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["change-password"]);
const { t } = useI18n();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.sections.account.title") }}</h3>
    <p class="settings-section__desc">{{ t("settings.sections.account.desc") }}</p>

    <dl class="settings-rows">
      <div class="settings-row">
        <dt class="settings-row__label">{{ t("settings.passwordStatus") }}</dt>
        <dd>{{ passwordStatusText }}</dd>
      </div>
      <div class="settings-row">
        <dt class="settings-row__label">{{ t("settings.sessionExpiry") }}</dt>
        <dd>{{ formatDate(sessionExpiresAt) }}</dd>
      </div>
    </dl>

    <div class="settings-section__actions">
      <button type="button" class="primary-button" @click="emit('change-password')">
        {{ t("settings.sections.account.changePassword") }}
      </button>
    </div>
  </div>
</template>
