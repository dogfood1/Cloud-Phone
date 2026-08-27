<script setup>
import { useI18n } from "vue-i18n";
import { NForm, NFormItem, NInput } from "naive-ui";

import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["submit"]);

const { t } = useI18n();
</script>

<template>
  <section role="dialog" aria-modal="true" :aria-label="t('auth.loginPassword')">
    <NForm class="auth-form" @submit.prevent="emit('submit')">
      <NFormItem :show-feedback="false">
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
