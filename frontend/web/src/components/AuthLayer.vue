<script setup>
import AuthLoginModal from "./AuthLoginModal.vue";
import AuthPasswordModal from "./AuthPasswordModal.vue";

defineProps({
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
</script>

<template>
  <div class="modal-layer modal-layer--auth">
    <AuthLoginModal
      v-if="showLoginModal"
      :state="state"
      @submit="emit('login')"
    />
    <AuthPasswordModal
      v-else-if="showPasswordChangeModal"
      :state="state"
      :mode="passwordChangeMode"
      @submit="emit('change-password')"
    />
  </div>
</template>
