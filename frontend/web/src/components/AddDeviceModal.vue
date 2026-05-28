<script setup>
import { computed, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useI18n } from "vue-i18n";

import "../assets/add-device-modal.css";

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close"]);

const { t } = useI18n();

const step = ref("platforms"); // platforms | android-usb
const baselineSerials = ref(new Set());

const platforms = [
  {
    id: "android",
    icon: "mdi:android",
    modes: ["usb", "qr", "pairCode"],
  },
  { id: "harmony", icon: "simple-icons:huawei" },
  { id: "apple", icon: "mdi:apple" },
];

const currentDevices = computed(() => props.devices ?? []);

const devicesBySerial = computed(() => {
  const map = new Map();

  for (const device of currentDevices.value) {
    if (device?.serial) {
      map.set(device.serial, device);
    }
  }

  return map;
});

const trackedDevices = computed(() => {
  if (step.value !== "android-usb") {
    return [];
  }

  const baselines = baselineSerials.value;
  const result = [];

  for (const device of currentDevices.value) {
    if (!device?.serial) {
      continue;
    }

    if (!baselines.has(device.serial)) {
      result.push(device);
    }
  }

  // if user had devices already, allow tracking by showing all as fallback
  if (result.length === 0) {
    return currentDevices.value.filter((device) => device?.serial);
  }

  return result;
});

const trackedSummary = computed(() => {
  const list = trackedDevices.value;
  const connected = list.filter((d) => d?.connected).length;
  const unauthorized = list.filter((d) => d?.state === "unauthorized").length;

  return {
    total: list.length,
    connected,
    unauthorized,
  };
});

function enterAndroidUsb() {
  baselineSerials.value = new Set(
    (currentDevices.value ?? []).map((device) => device?.serial).filter(Boolean),
  );
  step.value = "android-usb";
}

function backToPlatforms() {
  step.value = "platforms";
}

watch(
  () => props.devices,
  () => {
    // keep reactive when devices update during wizard
  },
);
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="add-device-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('devices.addDeviceModal.title')"
    >
      <header class="add-device-modal__header">
        <div>
          <h2>
            {{
              step === "android-usb"
                ? t("devices.addDeviceModal.usb.title")
                : t("devices.addDeviceModal.title")
            }}
          </h2>
          <p>
            {{
              step === "android-usb"
                ? t("devices.addDeviceModal.usb.desc")
                : t("devices.addDeviceModal.desc")
            }}
          </p>
        </div>
        <button
          type="button"
          class="add-device-modal__close"
          :aria-label="t('devices.addDeviceModal.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div v-if="step === 'platforms'" class="add-device-modal__grid">
        <article
          v-for="item in platforms"
          :key="item.id"
          class="add-device-modal__card"
          :class="{ 'add-device-modal__card--disabled': item.id !== 'android' }"
          :aria-disabled="item.id !== 'android'"
        >
          <Icon :icon="item.icon" class="add-device-modal__icon" />
          <h3>{{ t(`devices.addDeviceModal.platforms.${item.id}`) }}</h3>
          <ul v-if="item.modes?.length" class="add-device-modal__modes">
            <li
              v-for="mode in item.modes"
              :key="mode"
              class="add-device-modal__mode"
              :class="{ 'add-device-modal__mode--active': item.id === 'android' && mode === 'usb' }"
            >
              <button
                v-if="item.id === 'android' && mode === 'usb'"
                type="button"
                class="add-device-modal__mode-btn"
                @click="enterAndroidUsb"
              >
                <span>{{ t(`devices.addDeviceModal.androidModes.${mode}`) }}</span>
                <span class="add-device-modal__mode-badge">
                  {{ t("devices.addDeviceModal.usb.action") }}
                </span>
              </button>
              <template v-else>
                <span>{{ t(`devices.addDeviceModal.androidModes.${mode}`) }}</span>
                <span class="add-device-modal__mode-badge">
                  {{ t("devices.addDeviceModal.comingSoon") }}
                </span>
              </template>
            </li>
          </ul>
          <p v-if="item.id !== 'android'" class="add-device-modal__badge">
            {{ t("devices.addDeviceModal.comingSoon") }}
          </p>
        </article>
      </div>

      <div v-else class="add-device-modal__usb">
        <div class="add-device-modal__usb-hero" aria-hidden="true">
          <div class="usb-hero__phone" />
          <div class="usb-hero__cable">
            <span class="usb-hero__cable-line" />
            <span class="usb-hero__plug" />
          </div>
        </div>

        <div class="add-device-modal__usb-status">
          <p class="add-device-modal__usb-summary">
            {{
              t("devices.addDeviceModal.usb.summary", {
                total: trackedSummary.total,
                connected: trackedSummary.connected,
                unauthorized: trackedSummary.unauthorized,
              })
            }}
          </p>
          <ul class="add-device-modal__usb-list">
            <li v-for="device in trackedDevices" :key="device.serial" class="add-device-modal__usb-item">
              <div class="add-device-modal__usb-item-main">
                <strong>{{ device.displayName || device.serial }}</strong>
                <span class="add-device-modal__usb-item-sub">{{ device.serial }}</span>
              </div>
              <span
                class="add-device-modal__usb-state"
                :class="{
                  'add-device-modal__usb-state--ok': device.connected,
                  'add-device-modal__usb-state--warn': device.state === 'unauthorized',
                }"
              >
                {{
                  device.connected
                    ? t("devices.addDeviceModal.usb.stateConnected")
                    : device.state === "unauthorized"
                      ? t("devices.addDeviceModal.usb.stateUnauthorized")
                      : t("devices.addDeviceModal.usb.stateDetecting")
                }}
              </span>
            </li>
          </ul>
        </div>

        <div class="add-device-modal__usb-actions">
          <button type="button" class="ghost-button" @click="backToPlatforms">
            {{ t("common.back") }}
          </button>
          <button type="button" class="primary-button" @click="emit('close')">
            {{ t("devices.addDeviceModal.usb.done") }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
