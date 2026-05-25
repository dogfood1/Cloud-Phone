<script setup>
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
  <article class="device-card">
    <div class="device-card__preview">
      <img
        v-if="device.connected"
        :src="screenshotUrl"
        :alt="`${device.displayName} 截图`"
        loading="lazy"
      />
      <div v-else class="device-card__placeholder">设备未在线</div>
    </div>
    <div class="device-card__meta">
      <strong>{{ device.displayName }}</strong>
      <span>{{ device.ipAddress || "IP 不可用" }}</span>
    </div>
  </article>
</template>
