<script setup>
import { computed } from "vue";

import DeviceCard from "./DeviceCard.vue";
import { formatRefreshTime, summarizeDevices } from "../utils/device-format.js";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    required: true,
  },
  error: {
    type: String,
    required: true,
  },
  lastRefreshedAt: {
    type: String,
    default: null,
  },
  adbPath: {
    type: String,
    default: "",
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["refresh"]);

const summary = computed(() => summarizeDevices(props.devices));
const refreshLabel = computed(() => formatRefreshTime(props.lastRefreshedAt));
const statusText = computed(() => {
  if (props.loading) {
    return "正在同步设备…";
  }

  if (!props.devices.length) {
    return "暂无设备";
  }

  return `${summary.value.online} 在线 / ${summary.value.total} 台`;
});
</script>

<template>
  <section class="devices-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">设备</p>
        <h2>设备画廊</h2>
        <p class="panel-header__desc">展示 ADB 实机信息：型号、IP、系统版本、序列号与实时截图。</p>
      </div>
      <div class="panel-header__actions">
        <span class="status-pill" :class="{ 'status-pill--loading': loading }">{{ statusText }}</span>
        <button type="button" class="ghost-button" :disabled="loading" @click="emit('refresh')">
          {{ loading ? "刷新中…" : "立即刷新" }}
        </button>
      </div>
    </header>

    <div class="devices-toolbar">
      <p class="devices-toolbar__meta">
        <span>最近更新：{{ refreshLabel }}</span>
        <span v-if="adbPath" class="devices-toolbar__adb" :title="adbPath">ADB 已就绪</span>
      </p>
      <p v-if="summary.offline > 0" class="devices-toolbar__hint">
        {{ summary.offline }} 台设备离线或未授权，仅在线设备可获取截图与完整属性。
      </p>
    </div>

    <p v-if="error" class="feedback panel-feedback">
      {{ error }}
      <button type="button" class="feedback__retry" @click="emit('refresh')">重试</button>
    </p>

    <div v-if="!devices.length && !loading && !error" class="empty-state">
      <p>未检测到已连接设备</p>
      <span>请用 USB 或 `adb connect` 连接后点击「立即刷新」。</span>
    </div>

    <div v-else class="device-gallery" :class="{ 'device-gallery--loading': loading }">
      <DeviceCard
        v-for="device in devices"
        :key="device.serial"
        :device="device"
        :screenshot-url="screenshotUrl(device.serial)"
      />
    </div>
  </section>
</template>
