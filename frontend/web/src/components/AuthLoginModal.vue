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
const passwordVisible = ref(false);
</script>

<template>
  <section class="auth-modal" role="dialog" aria-modal="true">
    <div class="auth-modal__brand" aria-hidden="true">
      <AppIcon name="phone" />
    </div>
    <div class="auth-modal__header auth-modal__header--plain">
      <p class="eyebrow">身份验证</p>
      <h2>登录 Cloud Phone</h2>
    </div>
    <p class="auth-modal__intro">
      当前浏览器没有有效会话，请输入密码继续。系统仅使用单密码登录，不需要用户名。
    </p>
    <form class="auth-form" @submit.prevent="emit('submit')">
      <label class="field">
        <span>登录密码</span>
        <div class="field__control">
          <input
            v-model.trim="state.loginPassword"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
            required
          />
          <button type="button" class="field__toggle" @click="passwordVisible = !passwordVisible">
            {{ passwordVisible ? "隐藏" : "显示" }}
          </button>
        </div>
      </label>
      <div class="form-meta">
        <span>默认初始密码：admin</span>
        <span class="form-meta__state">{{ state.booting ? "检查中" : state.sessionStateText }}</span>
      </div>
      <p class="feedback">{{ state.loginFeedback }}</p>
      <button class="primary-button" type="submit" :disabled="state.loginPending">
        {{ state.loginPending ? "验证中..." : "进入控制台" }}
      </button>
    </form>
  </section>
</template>
