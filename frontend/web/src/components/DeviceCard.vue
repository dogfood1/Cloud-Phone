<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import {
  formatAndroidVersion,
  formatManufacturerLine,
  getDeviceStateLabel,
} from "../utils/device-format.js";
import { fetchEncryptedBinary } from "../utils/api.js";

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

const emit = defineEmits(["open"]);

const { t } = useI18n();

function handleOpen() {
  emit("open", props.device);
}

function handleKeydown(event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleOpen();
  }
}

const displaySrc = ref("");
const screenshotFailed = ref(false);
let screenshotObjectUrl = "";

const manufacturerLine = formatManufacturerLine(props.device);
const androidLine = formatAndroidVersion(props.device);
const stateLabel = computed(() => getDeviceStateLabel(props.device.state));

const screenshotAlt = computed(() =>
  t("devices.screenshotAlt", { name: props.device.displayName }),
);

function revokeScreenshotObjectUrl() {
  if (screenshotObjectUrl) {
    URL.revokeObjectURL(screenshotObjectUrl);
    screenshotObjectUrl = "";
  }
}

async function preloadScreenshot(url) {
  if (!url || !props.device.connected) {
    revokeScreenshotObjectUrl();
    displaySrc.value = "";
    return;
  }

  screenshotFailed.value = false;

  try {
    const blob = await fetchEncryptedBinary(url, { mime: "image/png" });
    revokeScreenshotObjectUrl();
    screenshotObjectUrl = URL.createObjectURL(blob);
    displaySrc.value = screenshotObjectUrl;
  } catch {
    if (!displaySrc.value) {
      screenshotFailed.value = true;
    }
  }
}

onUnmounted(() => {
  revokeScreenshotObjectUrl();
});

watch(
  () => props.screenshotUrl,
  (url) => {
    preloadScreenshot(url);
  },
  { immediate: true },
);

watch(
  () => props.device.connected,
  (connected) => {
    if (!connected) {
      displaySrc.value = "";
      screenshotFailed.value = false;
      return;
    }

    preloadScreenshot(props.screenshotUrl);
  },
);
</script>

<template>
  <article
    class="device-card device-card--clickable"
    :class="{ 'device-card--offline': !device.connected }"
    role="button"
    tabindex="0"
    @click="handleOpen"
    @keydown="handleKeydown"
  >
    <div class="device-card__preview">
      <img
        v-if="device.connected && displaySrc && !screenshotFailed"
        :src="displaySrc"
        :alt="screenshotAlt"
        decoding="async"
      />
      <div
        v-else-if="device.connected && screenshotFailed && !displaySrc"
        class="device-card__placeholder"
      >
        <AppIcon name="phone" />
        <span>{{ t("devices.screenshotFailed") }}</span>
      </div>
      <div v-else class="device-card__placeholder">
        <AppIcon name="phone" />
        <span>{{
          device.connected ? t("devices.waitingScreenshot") : t("devices.deviceOffline")
        }}</span>
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
          <dt>{{ t("devices.ip") }}</dt>
          <dd>{{ device.ipAddress || "—" }}</dd>
        </div>
        <div v-if="device.product || device.device">
          <dt>{{ t("devices.product") }}</dt>
          <dd>{{ [device.product, device.device].filter(Boolean).join(" · ") }}</dd>
        </div>
        <div>
          <dt>{{ t("devices.system") }}</dt>
          <dd>{{ androidLine || "—" }}</dd>
        </div>
        <div>
          <dt>{{ t("devices.serial") }}</dt>
          <dd class="device-card__mono">{{ device.serial }}</dd>
        </div>
        <div>
          <dt>{{ t("devices.adbState") }}</dt>
          <dd>{{ device.state }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
