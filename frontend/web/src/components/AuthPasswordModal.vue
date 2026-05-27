<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";

defineProps({
  state: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["submit"]);
const newPasswordVisible = ref(false);
const confirmPasswordVisible = ref(false);
const { t } = useI18n();
</script>

<template>
  <section class="auth-modal" role="dialog" aria-modal="true">
    <div class="auth-modal__brand" aria-hidden="true">
      <AppIcon name="shield" />
    </div>
    <div class="auth-modal__header auth-modal__header--plain">
      <p class="eyebrow">{{ t("auth.changeEyebrow") }}</p>
      <h2>{{ t("auth.changeTitle") }}</h2>
    </div>
    <p class="auth-modal__intro">{{ t("auth.changeIntro") }}</p>
    <form class="auth-form" @submit.prevent="emit('submit')">
      <label class="field">
        <span>{{ t("auth.newPassword") }}</span>
        <div class="field__control">
          <input
            v-model.trim="state.nextPassword"
            :type="newPasswordVisible ? 'text' : 'password'"
            :placeholder="t('auth.newPasswordPlaceholder')"
            autocomplete="new-password"
            required
          />
          <button
            type="button"
            class="field__toggle"
            @click="newPasswordVisible = !newPasswordVisible"
          >
            {{ newPasswordVisible ? t("common.hide") : t("common.show") }}
          </button>
        </div>
      </label>
      <label class="field">
        <span>{{ t("auth.confirmPassword") }}</span>
        <div class="field__control">
          <input
            v-model.trim="state.confirmPassword"
            :type="confirmPasswordVisible ? 'text' : 'password'"
            :placeholder="t('auth.confirmPasswordPlaceholder')"
            autocomplete="new-password"
            required
          />
          <button
            type="button"
            class="field__toggle"
            @click="confirmPasswordVisible = !confirmPasswordVisible"
          >
            {{ confirmPasswordVisible ? t("common.hide") : t("common.show") }}
          </button>
        </div>
      </label>
      <p class="feedback">{{ state.changeFeedback }}</p>
      <button class="primary-button" type="submit" :disabled="state.changePending">
        {{ state.changePending ? t("auth.updating") : t("auth.updateAndLogin") }}
      </button>
    </form>
  </section>
</template>
