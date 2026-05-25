<script setup>
import AppIcon from "./AppIcon.vue";
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
        <p class="panel-header__desc">查看设备连接、刷新策略与会话状态。</p>
      </div>
      <span class="status-pill" :class="{ 'status-pill--loading': devicesLoading }">
        {{ devicesLoading ? "同步中" : "运行中" }}
      </span>
    </header>

    <div class="console-stats">
      <article class="console-stat console-stat--devices">
        <div class="console-stat__icon"><AppIcon name="devices" /></div>
        <div>
          <p>在线设备</p>
          <strong>{{ deviceCount }}</strong>
          <span>在「设备」页查看截图画廊</span>
        </div>
      </article>
      <article class="console-stat console-stat--refresh">
        <div class="console-stat__icon"><AppIcon name="refresh" /></div>
        <div>
          <p>截图刷新</p>
          <strong>{{ screenshotIntervalSeconds }}s</strong>
          <span>可在「设置」中修改间隔</span>
        </div>
      </article>
      <article class="console-stat console-stat--session">
        <div class="console-stat__icon"><AppIcon name="shield" /></div>
        <div>
          <p>会话状态</p>
          <strong class="console-stat__value--text">{{ sessionStateText }}</strong>
          <span>到期：{{ formatDate(sessionExpiresAt) }}</span>
        </div>
      </article>
    </div>

    <p v-if="devicesError" class="feedback panel-feedback">{{ devicesError }}</p>
    <div v-else class="hint-card">
      <p>从左侧进入「设备」管理云手机实例，在「设置」中调整截图刷新与外观主题。</p>
    </div>
  </section>
</template>
