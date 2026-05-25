<script setup>
import { formatDate } from "../utils/format-date.js";

defineProps({
  deviceCount: {
    type: Number,
    required: true,
  },
  devicesLoading: {
    type: Boolean,
    required: true,
  },
  devicesError: {
    type: String,
    required: true,
  },
  sessionStateText: {
    type: String,
    required: true,
  },
  sessionExpiresAt: {
    type: String,
    default: null,
  },
  screenshotIntervalSeconds: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <section class="console-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">控制台</p>
        <h2>运行概览</h2>
      </div>
      <span class="panel-header__meta">{{ devicesLoading ? "同步中..." : "已连接" }}</span>
    </header>
    <div class="console-stats">
      <article class="console-stat">
        <p>在线设备</p>
        <strong>{{ deviceCount }}</strong>
        <span>在「设备」页查看截图画廊</span>
      </article>
      <article class="console-stat">
        <p>截图刷新</p>
        <strong>{{ screenshotIntervalSeconds }}s</strong>
        <span>可在「设置」中修改间隔</span>
      </article>
      <article class="console-stat">
        <p>会话状态</p>
        <strong>{{ sessionStateText }}</strong>
        <span>到期：{{ formatDate(sessionExpiresAt) }}</span>
      </article>
    </div>
    <p v-if="devicesError" class="feedback panel-feedback">{{ devicesError }}</p>
    <p v-else class="console-view__hint">左侧切换到「设备」管理云手机，「设置」调整截图刷新策略。</p>
  </section>
</template>
