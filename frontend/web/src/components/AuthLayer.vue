<script setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import AuthLoginModal from "./AuthLoginModal.vue";
import AuthPasswordModal from "./AuthPasswordModal.vue";
import ThemeToggle from "./ThemeToggle.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";

const props = defineProps({
  showLoginModal: {
    type: Boolean,
    required: true,
  },
  showPasswordChangeModal: {
    type: Boolean,
    required: true,
  },
  passwordChangeMode: {
    type: String,
    default: "forced",
  },
  state: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["login", "change-password"]);
const { t } = useI18n();
const feedback = useAppFeedback();

const activeStep = computed(() => (props.showPasswordChangeModal ? 2 : 1));

const showDefaultPasswordHints = computed(() => !props.state.passwordConfigured);

const stepItems = computed(() => [
  { id: 1, label: t("auth.enterConsole") },
  { id: 2, label: t("auth.changeTitleVoluntary") },
]);

watch(
  () => props.state.loginFeedback,
  (message) => {
    if (message) {
      feedback.error(message);
    }
  },
);

watch(
  () => props.state.changeFeedback,
  (message) => {
    if (message) {
      feedback.error(message);
    }
  },
);
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__layout">
      <aside class="auth-page__aside">
        <div class="auth-page__brand">
          <div class="auth-page__brand-icon">
            <AppIcon name="phone" />
          </div>
          <div class="auth-page__brand-text">
            <strong>Cloud Phone</strong>
            <span>{{ t("sidebar.brandTitle") }}</span>
          </div>
        </div>

        <div>
          <h1 class="auth-page__aside-title">{{ t("auth.loginTitle") }}</h1>
          <p class="auth-page__aside-desc">{{ t("auth.loginIntro") }}</p>
        </div>

        <ul v-if="showDefaultPasswordHints" class="auth-page__features">
          <li class="auth-page__feature">{{ t("auth.defaultPasswordHint") }}</li>
          <li class="auth-page__feature">{{ t("auth.changeIntroVoluntary") }}</li>
        </ul>
      </aside>

      <section class="auth-card-shell">
        <header class="auth-card-shell__bar">
          <div class="auth-card-shell__brand-mobile">
            <div class="auth-page__brand-icon">
              <AppIcon name="phone" />
            </div>
            <div>
              <strong>Cloud Phone</strong>
              <span>{{ t("sidebar.brandTitle") }}</span>
            </div>
          </div>
          <div class="auth-card-shell__theme">
            <ThemeToggle />
          </div>
        </header>

        <div class="auth-card-shell__steps" :aria-label="t('auth.loginEyebrow')">
          <div
            v-for="step in stepItems"
            :key="step.id"
            class="auth-card-shell__step"
            :class="{
              'auth-card-shell__step--active': activeStep === step.id,
              'auth-card-shell__step--done': activeStep > step.id,
            }"
          >
            <span class="auth-card-shell__step-track" />
            <span class="auth-card-shell__step-label">{{ step.label }}</span>
          </div>
        </div>

        <div class="auth-card-shell__body">
          <AuthLoginModal v-if="showLoginModal" :state="state" @submit="emit('login')" />
          <AuthPasswordModal
            v-else-if="showPasswordChangeModal"
            :state="state"
            :mode="passwordChangeMode"
            @submit="emit('change-password')"
          />
        </div>
      </section>
    </div>
  </div>
</template>
