<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NForm, NFormItem, NInput } from "naive-ui";

import HelpHint from "./ui/HelpHint.vue";
import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["submit"]);

const { t } = useI18n();

const loginHelpContent = computed(() =>
  props.state.passwordConfigured
    ? t("auth.loginIntro")
    : `${t("auth.loginIntro")}\n${t("auth.defaultPasswordHint")}`,
);
</script>

<template>
  <section role="dialog" aria-modal="true" aria-labelledby="auth-login-title">
    <div class="auth-card__head">
      <p class="auth-card__eyebrow">{{ t("auth.loginEyebrow") }}</p>
      <div class="auth-card__title-row">
        <h2 id="auth-login-title" class="auth-card__title">{{ t("auth.loginTitle") }}</h2>
        <HelpHint
          :content="loginHelpContent"
          :title="t('auth.loginTitle')"
          size="sm"
        />
      </div>
    </div>

    <NForm class="auth-form" @submit.prevent="emit('submit')">
      <NFormItem :label="t('auth.loginPassword')" :show-feedback="false">
        <NInput
          v-model:value="state.loginPassword"
          type="password"
          show-password-on="click"
          :placeholder="t('auth.loginPlaceholder')"
          autocomplete="current-password"
          @keydown.enter="emit('submit')"
        />
      </NFormItem>

      <UiButton
        variant="primary"
        block
        :loading="state.loginPending"
        :disabled="state.booting"
        attr-type="submit"
      >
        {{ state.loginPending ? t("auth.verifying") : t("auth.enterConsole") }}
      </UiButton>
    </NForm>
  </section>
</template>
