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
      </div>
      <span class="panel-header__meta">
        {{ loading ? "刷新中..." : `共 ${devices.length} 台` }}
      </span>
    </header>
    <p v-if="error" class="feedback panel-feedback">{{ error }}</p>
    <div v-if="!devices.length && !loading" class="empty-state">
      未检测到已连接设备，请确认 ADB 已连接。
    </div>
    <div v-else class="device-gallery">
      <DeviceCard
        v-for="device in devices"
        :key="device.serial"
        :device="device"
        :screenshot-url="screenshotUrl(device.serial)"
      />
    </div>
  </section>
</template>
