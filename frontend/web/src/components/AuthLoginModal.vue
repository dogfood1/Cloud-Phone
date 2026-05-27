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
const passwordVisible = ref(false);
const { t } = useI18n();
</script>

<template>
  <section class="auth-modal" role="dialog" aria-modal="true">
    <div class="auth-modal__brand" aria-hidden="true">
      <AppIcon name="phone" />
    </div>
    <div class="auth-modal__header auth-modal__header--plain">
      <p class="eyebrow">{{ t("auth.loginEyebrow") }}</p>
      <h2>{{ t("auth.loginTitle") }}</h2>
    </div>
    <p class="auth-modal__intro">{{ t("auth.loginIntro") }}</p>
    <form class="auth-form" @submit.prevent="emit('submit')">
      <label class="field">
        <span>{{ t("auth.loginPassword") }}</span>
        <div class="field__control">
          <input
            v-model.trim="state.loginPassword"
            :type="passwordVisible ? 'text' : 'password'"
            :placeholder="t('auth.loginPlaceholder')"
            autocomplete="current-password"
            required
          />
          <button type="button" class="field__toggle" @click="passwordVisible = !passwordVisible">
            {{ passwordVisible ? t("common.hide") : t("common.show") }}
          </button>
        </div>
      </label>
      <div class="form-meta">
        <span>{{ t("auth.defaultPasswordHint") }}</span>
        <span class="form-meta__state">{{ state.booting ? t("auth.sessionChecking") : state.sessionStateText }}</span>
      </div>
      <p class="feedback">{{ state.loginFeedback }}</p>
      <button class="primary-button" type="submit" :disabled="state.loginPending">
        {{ state.loginPending ? t("auth.verifying") : t("auth.enterConsole") }}
      </button>
    </form>
  </section>
</template>
