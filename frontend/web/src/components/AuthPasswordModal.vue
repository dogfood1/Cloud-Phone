<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NForm, NFormItem, NInput, NSpace } from "naive-ui";

import HelpHint from "./ui/HelpHint.vue";
import UiButton from "./ui/UiButton.vue";

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: "forced",
    validator: (value) => value === "forced" || value === "voluntary",
  },
});

const emit = defineEmits(["submit", "cancel"]);

const { t } = useI18n();

const isVoluntary = computed(() => props.mode === "voluntary");
const title = computed(() =>
  isVoluntary.value ? t("auth.changeTitleVoluntary") : t("auth.changeTitle"),
);
const intro = computed(() =>
  isVoluntary.value ? t("auth.changeIntroVoluntary") : t("auth.changeIntro"),
);
const submitLabel = computed(() => {
  if (props.state.changePending) {
    return t("auth.updating");
  }

  return isVoluntary.value ? t("auth.savePassword") : t("auth.updateAndLogin");
});
</script>

<template>
  <section role="dialog" aria-modal="true" aria-labelledby="auth-password-title">
    <div class="auth-card__head">
      <p class="auth-card__eyebrow">{{ t("auth.changeEyebrow") }}</p>
      <div class="auth-card__title-row">
        <h2 id="auth-password-title" class="auth-card__title">{{ title }}</h2>
        <HelpHint :content="intro" :title="title" size="sm" />
      </div>
    </div>

    <NForm class="auth-form" @submit.prevent="emit('submit')">
      <NFormItem v-if="isVoluntary" :label="t('auth.currentPassword')" :show-feedback="false">
        <NInput
          v-model:value="state.currentPassword"
          type="password"
          show-password-on="click"
          :placeholder="t('auth.currentPasswordPlaceholder')"
          autocomplete="current-password"
        />
      </NFormItem>

      <NFormItem :label="t('auth.newPassword')" :show-feedback="false">
        <NInput
          v-model:value="state.nextPassword"
          type="password"
          show-password-on="click"
          :placeholder="t('auth.newPasswordPlaceholder')"
          autocomplete="new-password"
        />
      </NFormItem>

      <NFormItem :label="t('auth.confirmPassword')" :show-feedback="false">
        <NInput
          v-model:value="state.confirmPassword"
          type="password"
          show-password-on="click"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          autocomplete="new-password"
        />
      </NFormItem>

      <NSpace :size="10" :vertical="false" justify="end" class="auth-form__actions">
        <UiButton v-if="isVoluntary" variant="ghost" :disabled="state.changePending" @click="emit('cancel')">
          {{ t("auth.cancel") }}
        </UiButton>
        <UiButton
          variant="primary"
          :loading="state.changePending"
          attr-type="submit"
        >
          {{ submitLabel }}
        </UiButton>
      </NSpace>
    </NForm>
  </section>
</template>
