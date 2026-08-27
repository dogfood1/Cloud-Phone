<script setup>
import { watch } from "vue";

import AuthLoginModal from "./AuthLoginModal.vue";
import AuthPasswordModal from "./AuthPasswordModal.vue";
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
const feedback = useAppFeedback();

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
      <section class="auth-card-shell">
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
