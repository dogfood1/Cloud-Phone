<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useDeviceScrcpyCast } from "../composables/useDeviceScrcpyCast.js";
import { getErrorMessage } from "../utils/api.js";
import { startDeviceCast, stopDeviceCast } from "../utils/cast-api.js";
import {
  GROUP_CONTROL_MAX_SIZE_FALLBACKS,
  buildGroupControlCastOptions,
} from "../utils/group-control-cast-options.js";
import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  startDelayMs: {
    type: Number,
    default: 0,
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
let startTimer = null;

const serialRef = toRef(() => props.device.serial);
const { beginCast, stopCast, status, errorMessage } = useDeviceScrcpyCast(
  serialRef,
  canvasRef,
  castOptionsRef,
  rotatorRef,
  viewportRef,
);

const isStreaming = computed(() => status.value === "streaming");
const isStarting = computed(() => status.value === "starting" || castBusy.value);
const hasError = computed(() => status.value === "error" || Boolean(localError.value));
const displayError = computed(() => localError.value || errorMessage.value);
const browserUnsupported = computed(() => !WsScrcpyAnnexBPlayer.isSupported());

async function cleanupCastSession() {
  await stopCast();
}

async function startGroupCast() {
  localError.value = "";

  if (!props.device.connected || !props.device.serial) {
    return;
  }

  if (browserUnsupported.value) {
    localError.value = t("groupControl.cast.unsupportedBrowser");
    return;
  }

  castBusy.value = true;

  try {
    await cleanupCastSession();

    let lastError = null;

    for (const maxSize of GROUP_CONTROL_MAX_SIZE_FALLBACKS) {
      try {
        castOptionsRef.value = buildGroupControlCastOptions(props.device, { maxSize });
        const payload = await startDeviceCast(props.device.serial, castOptionsRef.value);
        await beginCast(payload);
        return;
      } catch (error) {
        lastError = error;
        await stopDeviceCast(props.device.serial).catch(() => {});
        await stopCast({ backend: false });
      }
    }

    throw lastError ?? new Error(t("groupControl.cast.startFailed"));
  } catch (error) {
    localError.value = getErrorMessage(error, t("groupControl.cast.startFailed"));
  } finally {
    castBusy.value = false;
  }
}

function handleRemove() {
  emit("remove", props.device.serial);
}

function scheduleStartCast(delayMs = props.startDelayMs) {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }

  startTimer = window.setTimeout(() => {
    startTimer = null;
    void startGroupCast();
  }, Math.max(0, delayMs));
}

watch(
  () => props.device.connected,
  (connected, wasConnected) => {
    if (connected && !wasConnected) {
      scheduleStartCast();
      return;
    }

    if (!connected && wasConnected) {
      if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
      }
      void cleanupCastSession();
    }
  },
);

onBeforeUnmount(() => {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  void cleanupCastSession();
});

void nextTick(() => {
  scheduleStartCast();
});
</script>

<template>
  <article
    class="group-control-slot"
    :class="{ 'group-control-slot--offline': !device.connected }"
  >
    <div ref="viewportRef" class="group-control-cast">
      <div
        v-show="isStreaming || isStarting"
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
        v-else-if="isStarting && !isStreaming"
        class="group-control-cast__overlay"
      >
        <p>{{ t("groupControl.cast.starting") }}</p>
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
