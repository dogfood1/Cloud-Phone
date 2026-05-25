<script setup>
import DeviceCard from "./DeviceCard.vue";

defineProps({
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
  screenshotUrl: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <section class="devices-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">设备</p>
        <h2>设备画廊</h2>
        <p class="panel-header__desc">实时预览已连接设备画面，自动同步名称与 IP。</p>
      </div>
      <span class="status-pill" :class="{ 'status-pill--loading': loading }">
        {{ loading ? "刷新中" : `共 ${devices.length} 台` }}
      </span>
    </header>

    <p v-if="error" class="feedback panel-feedback">{{ error }}</p>

    <div v-if="!devices.length && !loading" class="empty-state">
      <p>未检测到已连接设备</p>
      <span>请确认 USB 调试或网络 ADB 已连接后刷新。</span>
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
