<script setup>
import { ref } from "vue";

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
</script>

<template>
  <section class="auth-modal" role="dialog" aria-modal="true">
    <div class="auth-modal__brand" aria-hidden="true">
      <AppIcon name="shield" />
    </div>
    <div class="auth-modal__header auth-modal__header--plain">
      <p class="eyebrow">强制改密</p>
      <h2>默认密码不可继续使用</h2>
    </div>
    <p class="auth-modal__intro">
      检测到当前密码仍为默认值 <code>admin</code>。为了继续使用控制台，请先设置新的登录密码。
    </p>
    <form class="auth-form" @submit.prevent="emit('submit')">
      <label class="field">
        <span>新密码</span>
        <div class="field__control">
          <input
            v-model.trim="state.nextPassword"
            :type="newPasswordVisible ? 'text' : 'password'"
            placeholder="至少 6 位"
            autocomplete="new-password"
            required
          />
          <button type="button" class="field__toggle" @click="newPasswordVisible = !newPasswordVisible">
            {{ newPasswordVisible ? "隐藏" : "显示" }}
          </button>
        </div>
      </label>
      <label class="field">
        <span>确认新密码</span>
        <div class="field__control">
          <input
            v-model.trim="state.confirmPassword"
            :type="confirmPasswordVisible ? 'text' : 'password'"
            placeholder="再次输入新密码"
            autocomplete="new-password"
            required
          />
          <button
            type="button"
            class="field__toggle"
            @click="confirmPasswordVisible = !confirmPasswordVisible"
          >
            {{ confirmPasswordVisible ? "隐藏" : "显示" }}
          </button>
        </div>
      </label>
      <p class="feedback">{{ state.changeFeedback }}</p>
      <button class="primary-button" type="submit" :disabled="state.changePending">
        {{ state.changePending ? "更新中..." : "更新密码并登录" }}
      </button>
    </form>
  </section>
</template>
