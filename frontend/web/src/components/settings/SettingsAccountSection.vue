<script setup>
import { useI18n } from "vue-i18n";
import { NTag } from "naive-ui";

import UiButton from "../ui/UiButton.vue";
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
  <div class="settings-section shell-panel-content">
    <dl class="shell-form-rows">
      <div class="shell-form-row">
        <dt class="shell-form-row__label">{{ t("settings.passwordStatus") }}</dt>
        <dd><NTag round type="success" size="small">{{ passwordStatusText }}</NTag></dd>
      </div>
      <div class="shell-form-row">
        <dt class="shell-form-row__label">{{ t("settings.sessionExpiry") }}</dt>
        <dd><NTag round size="small">{{ formatDate(sessionExpiresAt) }}</NTag></dd>
      </div>
    </dl>

    <div class="shell-form-actions">
      <UiButton variant="primary" @click="emit('change-password')">
        {{ t("settings.sections.account.changePassword") }}
      </UiButton>
    </div>
  </div>
</template>
