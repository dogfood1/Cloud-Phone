<script setup>
import AppIcon from "./AppIcon.vue";

defineProps({
  device: {
    type: Object,
    required: true,
  },
  screenshotUrl: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <article class="device-card" :class="{ 'device-card--offline': !device.connected }">
    <div class="device-card__preview">
      <img
        v-if="device.connected"
        :src="screenshotUrl"
        :alt="`${device.displayName} 截图`"
        loading="lazy"
      />
      <div v-else class="device-card__placeholder">
        <AppIcon name="phone" />
        <span>设备未在线</span>
      </div>
      <span
        class="device-card__status"
        :class="device.connected ? 'device-card__status--online' : 'device-card__status--offline'"
      >
        {{ device.connected ? "在线" : "离线" }}
      </span>
    </div>
    <div class="device-card__meta">
      <strong>{{ device.displayName }}</strong>
      <span class="device-card__ip">
        <AppIcon name="wifi" />
        {{ device.ipAddress || "IP 不可用" }}
      </span>
    </div>
  </article>
</template>
