<script setup>
import { ref } from "vue";

import AppIcon from "./AppIcon.vue";
import {
  formatAndroidVersion,
  formatManufacturerLine,
  getDeviceStateLabel,
} from "../utils/device-format.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  screenshotUrl: {
    type: String,
    required: true,
  },
});

const screenshotFailed = ref(false);

const manufacturerLine = formatManufacturerLine(props.device);
const androidLine = formatAndroidVersion(props.device);
const stateLabel = getDeviceStateLabel(props.device.state);

function handleScreenshotError() {
  screenshotFailed.value = true;
}
</script>

<template>
  <article class="device-card" :class="{ 'device-card--offline': !device.connected }">
    <div class="device-card__preview">
      <img
        v-if="device.connected && !screenshotFailed"
        :src="screenshotUrl"
        :alt="`${device.displayName} 截图`"
        loading="lazy"
        @error="handleScreenshotError"
      />
      <div v-else class="device-card__placeholder">
        <AppIcon name="phone" />
        <span>{{ device.connected ? "截图加载失败" : "设备未在线" }}</span>
      </div>
      <span
        class="device-card__status"
        :class="device.connected ? 'device-card__status--online' : 'device-card__status--offline'"
      >
        {{ stateLabel }}
      </span>
    </div>

    <div class="device-card__meta">
      <div class="device-card__title">
        <strong>{{ device.displayName }}</strong>
        <span v-if="manufacturerLine" class="device-card__subtitle">{{ manufacturerLine }}</span>
      </div>

      <dl class="device-card__facts">
        <div>
          <dt>IP 地址</dt>
          <dd>{{ device.ipAddress || "—" }}</dd>
        </div>
        <div v-if="device.product || device.device">
          <dt>产品</dt>
          <dd>{{ [device.product, device.device].filter(Boolean).join(" · ") }}</dd>
        </div>
        <div>
          <dt>系统</dt>
          <dd>{{ androidLine || "—" }}</dd>
        </div>
        <div>
          <dt>序列号</dt>
          <dd class="device-card__mono">{{ device.serial }}</dd>
        </div>
        <div>
          <dt>ADB 状态</dt>
          <dd>{{ device.state }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
