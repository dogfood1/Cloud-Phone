<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "./AppIcon.vue";
import { fetchEncryptedBinary } from "../utils/api.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  screenshotUrl: {
    type: String,
    default: "",
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();

const displaySrc = ref("");
const screenshotFailed = ref(false);
let screenshotObjectUrl = "";

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
  <div
    class="group-control-preview"
    :class="{ 'group-control-preview--compact': compact }"
  >
    <img
      v-if="device.connected && displaySrc && !screenshotFailed"
      :src="displaySrc"
      :alt="screenshotAlt"
      decoding="async"
    />
    <div
      v-else-if="device.connected && screenshotFailed && !displaySrc"
      class="group-control-preview__placeholder"
    >
      <AppIcon name="phone" />
    </div>
    <div v-else class="group-control-preview__placeholder">
      <AppIcon name="phone" />
    </div>
  </div>
</template>
