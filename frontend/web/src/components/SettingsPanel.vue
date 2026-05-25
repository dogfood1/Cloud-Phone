<script setup>
import { formatDate } from "../utils/format-date.js";

defineProps({
  settingsForm: {
    type: Object,
    required: true,
  },
  settingsFeedback: {
    type: String,
    required: true,
  },
  passwordStatusText: {
    type: String,
    required: true,
  },
  sessionExpiresAt: {
    type: String,
    default: null,
  },
});

defineEmits(["save"]);
</script>

<template>
  <section class="settings-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">设置</p>
        <h2>显示与刷新</h2>
      </div>
    </header>
    <form class="settings-form" @submit.prevent="$emit('save')">
      <label class="field">
        <span>截图刷新间隔（秒）</span>
        <div class="field__control">
          <input
            v-model.number="settingsForm.screenshotIntervalSeconds"
            type="number"
            min="1"
            max="120"
            step="1"
            required
          />
        </div>
      </label>
      <p class="settings-form__hint">设备画廊顶部截图将按该间隔自动更新，默认 5 秒。</p>
      <p v-if="settingsFeedback" class="feedback">{{ settingsFeedback }}</p>
      <button class="primary-button" type="submit">保存设置</button>
    </form>
    <dl class="settings-meta">
      <div>
        <dt>密码状态</dt>
        <dd>{{ passwordStatusText }}</dd>
      </div>
      <div>
        <dt>会话到期</dt>
        <dd>{{ formatDate(sessionExpiresAt) }}</dd>
      </div>
    </dl>
  </section>
</template>
