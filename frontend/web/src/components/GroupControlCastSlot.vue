<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useDeviceScrcpyCast } from "../composables/useDeviceScrcpyCast.js";
import { getErrorMessage } from "../utils/api.js";
import { startDeviceCast, stopDeviceCast } from "../utils/cast-api.js";
import { acquireGroupCastStartSlot } from "../utils/group-control-cast-start.js";
import { buildGroupControlCastOptions } from "../utils/group-control-cast-options.js";
import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";
import GroupControlDevicePreview from "./GroupControlDevicePreview.vue";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  screenshotUrl: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["toggle-select"]);

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

const isStreaming = computed(() => props.selected && status.value === "streaming");
const isStarting = computed(
  () => props.selected && (status.value === "starting" || castBusy.value),
);
const hasError = computed(
  () => props.selected && (status.value === "error" || Boolean(localError.value)),
);
const displayError = computed(() => localError.value || errorMessage.value);
const browserUnsupported = computed(() => !WsScrcpyAnnexBPlayer.isSupported());
const showLogOverlay = computed(
  () =>
    props.selected &&
    (showStartupLogs.value || (castBusy.value && !isStreaming.value && !hasError.value)),
);

async function cleanupCastSession() {
  await stopCast();
}

async function startGroupCast() {
  const token = ++startToken;
  localError.value = "";

  if (!props.selected || !props.device.connected || !props.device.serial) {
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
    if (token !== startToken || !props.selected) {
      return;
    }

    await cleanupCastSession();

    if (token !== startToken || !props.selected) {
      return;
    }

    castOptionsRef.value = buildGroupControlCastOptions(props.device);
    const payload = await startDeviceCast(props.device.serial, castOptionsRef.value);

    if (token !== startToken || !props.selected) {
      await stopDeviceCast(props.device.serial).catch(() => {});
      return;
    }

    await beginCast(payload);
  } catch (error) {
    if (token === startToken && props.selected) {
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

function handleToggleSelect() {
  emit("toggle-select");
}

function handlePreviewSelect(event) {
  if (props.selected) {
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  emit("toggle-select");
}

watch(
  () => props.selected,
  (selected, wasSelected) => {
    if (selected && !wasSelected) {
      void nextTick(() => startGroupCast());
      return;
    }

    if (!selected && wasSelected) {
      startToken += 1;
      localError.value = "";
      void cleanupCastSession();
    }
  },
  { immediate: true },
);

watch(
  () => props.device.connected,
  (connected, wasConnected) => {
    if (!props.selected) {
      return;
    }

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
</script>

<template>
  <article
    class="group-control-slot"
    :class="{ 'group-control-slot--selected': selected }"
  >
    <div class="group-control-slot__card">
      <button
        type="button"
        class="group-control-slot__chrome"
        :class="{ 'group-control-slot__chrome--selected': selected }"
        :aria-pressed="selected"
        @click="handleToggleSelect"
      >
        <span class="group-control-slot__check" aria-hidden="true">
          <svg v-if="selected" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 8.2 6.4 11 12.5 5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="group-control-slot__name">{{ device.displayName }}</span>
      </button>

      <div
        ref="viewportRef"
        class="group-control-cast__screen"
        :class="{ 'group-control-cast__screen--live': selected }"
        @click="handlePreviewSelect"
      >
        <template v-if="selected">
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

          <div v-if="!device.connected" class="group-control-cast__overlay">
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
            <button type="button" class="ghost-button" @click.stop="startGroupCast">
              {{ t("common.retry") }}
            </button>
          </div>
        </template>

        <div v-else class="group-control-cast__idle">
          <GroupControlDevicePreview
            :device="device"
            :screenshot-url="screenshotUrl"
          />
          <div class="group-control-cast__idle-hint">
            {{ t("groupControl.tapToSelect") }}
          </div>
        </div>
      </div>

      <button
        type="button"
        class="group-control-slot__chrome group-control-slot__chrome--footer"
        :class="{ 'group-control-slot__chrome--selected': selected }"
        :aria-pressed="selected"
        @click="handleToggleSelect"
      >
        <span class="group-control-slot__hint">{{
          selected ? t("groupControl.selectedHint") : t("groupControl.unselectedHint")
        }}</span>
      </button>
    </div>
  </article>
</template>
