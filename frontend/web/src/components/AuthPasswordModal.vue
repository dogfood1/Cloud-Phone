<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";

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

const newPasswordVisible = ref(false);
const confirmPasswordVisible = ref(false);
const currentPasswordVisible = ref(false);
const { t } = useI18n();

const isVoluntary = computed(() => props.mode === "voluntary");
const showCurrentPassword = computed(() => isVoluntary.value);
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
  <section class="auth-modal" role="dialog" aria-modal="true">
    <div class="auth-modal__brand" aria-hidden="true">
      <AppIcon name="shield" />
    </div>
    <div class="auth-modal__header auth-modal__header--plain">
      <p class="eyebrow">{{ t("auth.changeEyebrow") }}</p>
      <h2>{{ title }}</h2>
    </div>
    <p class="auth-modal__intro">{{ intro }}</p>
    <form class="auth-form" @submit.prevent="emit('submit')">
      <label v-if="showCurrentPassword" class="field">
        <span>{{ t("auth.currentPassword") }}</span>
        <div class="field__control">
          <input
            v-model.trim="state.currentPassword"
            :type="currentPasswordVisible ? 'text' : 'password'"
            :placeholder="t('auth.currentPasswordPlaceholder')"
            autocomplete="current-password"
            required
          />
          <button
            type="button"
            class="field__toggle"
            @click="currentPasswordVisible = !currentPasswordVisible"
          >
            {{ currentPasswordVisible ? t("common.hide") : t("common.show") }}
          </button>
        </div>
      </label>
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
      <div class="auth-modal__actions">
        <button
          v-if="isVoluntary"
          type="button"
          class="ghost-button"
          :disabled="state.changePending"
          @click="emit('cancel')"
        >
          {{ t("auth.cancel") }}
        </button>
        <button class="primary-button" type="submit" :disabled="state.changePending">
          {{ submitLabel }}
        </button>
      </div>
    </form>
  </section>
</template>
