<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useDeviceScrcpyCast } from "../composables/useDeviceScrcpyCast.js";
import { getErrorMessage } from "../utils/api.js";
import { startDeviceCast, stopDeviceCast } from "../utils/cast-api.js";
import { acquireGroupCastStartSlot } from "../utils/group-control-cast-start.js";
import { buildGroupControlCastOptions } from "../utils/group-control-cast-options.js";
import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["remove"]);

const { t } = useI18n();
const canvasRef = ref(null);
const rotatorRef = ref(null);
const viewportRef = ref(null);
const castOptionsRef = ref(buildGroupControlCastOptions(props.device));
const castBusy = ref(false);
const localError = ref("");
let startToken = 0;

const serialRef = toRef(() => props.device.serial);
const {
  beginCast,
  stopCast,
  status,
  errorMessage,
  startupLogText,
  showStartupLogs,
} = useDeviceScrcpyCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef);

const isStreaming = computed(() => status.value === "streaming");
const isStarting = computed(() => status.value === "starting" || castBusy.value);
const hasError = computed(() => status.value === "error" || Boolean(localError.value));
const displayError = computed(() => localError.value || errorMessage.value);
const browserUnsupported = computed(() => !WsScrcpyAnnexBPlayer.isSupported());
const showLogOverlay = computed(
  () => showStartupLogs.value || (castBusy.value && !isStreaming.value && !hasError.value),
);

async function cleanupCastSession() {
  await stopCast();
}

async function startGroupCast() {
  const token = ++startToken;
  localError.value = "";

  if (!props.device.connected || !props.device.serial) {
    return;
  }

  if (browserUnsupported.value) {
    localError.value = t("groupControl.cast.unsupportedBrowser");
    return;
  }

  if (castBusy.value) {
    return;
  }

  castBusy.value = true;
  const releaseStartSlot = await acquireGroupCastStartSlot();

  try {
    if (token !== startToken) {
      return;
    }

    await cleanupCastSession();

    if (token !== startToken) {
      return;
    }

    castOptionsRef.value = buildGroupControlCastOptions(props.device);
    const payload = await startDeviceCast(props.device.serial, castOptionsRef.value);

    if (token !== startToken) {
      await stopDeviceCast(props.device.serial).catch(() => {});
      return;
    }

    await beginCast(payload);
  } catch (error) {
    if (token === startToken) {
      await stopDeviceCast(props.device.serial).catch(() => {});
      await stopCast({ backend: false }).catch(() => {});
      localError.value = getErrorMessage(error, t("groupControl.cast.startFailed"));
    }
  } finally {
    releaseStartSlot();
    if (token === startToken) {
      castBusy.value = false;
    }
  }
}

function handleRemove() {
  startToken += 1;
  emit("remove", props.device.serial);
}

watch(
  () => props.device.connected,
  (connected, wasConnected) => {
    if (connected && !wasConnected) {
      void startGroupCast();
      return;
    }

    if (!connected && wasConnected) {
      startToken += 1;
      void cleanupCastSession();
    }
  },
);

onBeforeUnmount(() => {
  startToken += 1;
  void cleanupCastSession();
});

void nextTick(() => {
  void startGroupCast();
});
</script>

<template>
  <article
    class="group-control-slot"
    :class="{ 'group-control-slot--offline': !device.connected }"
  >
    <div ref="viewportRef" class="group-control-cast">
      <div
        v-show="isStreaming || (isStarting && !showLogOverlay)"
        class="group-control-cast__stage"
      >
        <div ref="rotatorRef" class="group-control-cast__rotator">
          <canvas
            ref="canvasRef"
            class="group-control-cast__canvas device-cast-viewport__canvas device-cast-viewport__canvas--interactive"
            :aria-label="t('groupControl.cast.previewAria', { name: device.displayName })"
          />
        </div>
      </div>

      <div
        v-if="!device.connected"
        class="group-control-cast__overlay"
      >
        <p>{{ t("groupControl.cast.offline") }}</p>
      </div>
      <div
        v-else-if="browserUnsupported"
        class="group-control-cast__overlay group-control-cast__overlay--error"
      >
        <p>{{ t("groupControl.cast.unsupportedBrowser") }}</p>
      </div>
      <div
        v-else-if="showLogOverlay && !hasError"
        class="group-control-cast__overlay group-control-cast__overlay--logs"
      >
        <div class="group-control-cast__log-panel">
          <p class="group-control-cast__log-title">{{ t("groupControl.cast.starting") }}</p>
          <pre class="group-control-cast__log-text">{{
            startupLogText || t("groupControl.cast.preparing")
          }}</pre>
        </div>
      </div>
      <div
        v-else-if="hasError"
        class="group-control-cast__overlay group-control-cast__overlay--error"
      >
        <p>{{ displayError }}</p>
        <button type="button" class="ghost-button" @click="startGroupCast">
          {{ t("common.retry") }}
        </button>
      </div>

      <button
        type="button"
        class="group-control-slot__remove"
        :aria-label="t('groupControl.removeDevice')"
        :title="t('groupControl.removeDevice')"
        @click="handleRemove"
      >
        ×
      </button>
    </div>

    <strong class="group-control-slot__name">{{ device.displayName }}</strong>
  </article>
</template>
