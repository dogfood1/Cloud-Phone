<script setup>
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useI18n } from "vue-i18n";

import "../assets/add-device-modal.css";
import { getErrorMessage, requestJson } from "../utils/api.js";

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close"]);

const { t } = useI18n();

const step = ref("platforms"); // platforms | android-usb | android-pair-code
const baselineSerials = ref(new Set());
const pairForm = ref({
  host: "",
  port: "",
  pairingCode: "",
});
const pairPending = ref(false);
const pairResult = ref(null);

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

async function submitPairCode() {
  pairPending.value = true;
  pairResult.value = null;

  try {
    const host = pairForm.value.host.trim();
    const port = Number.parseInt(pairForm.value.port, 10);
    const pairingCode = pairForm.value.pairingCode.trim();

    const result = await requestJson("/api/devices/pair-code", {
      method: "POST",
      body: { host, port, pairingCode },
    });

    pairResult.value = {
      ok: Boolean(result.success),
      message: result?.pair?.output || t("devices.addDeviceModal.pairCode.pairSuccess"),
      connectOk: Boolean(result?.connect?.success),
      connectMessage:
        result?.connect?.connectedEndpoint ||
        result?.connect?.attempts?.find((item) => item.ok)?.endpoint ||
        t("devices.addDeviceModal.pairCode.connectFailed"),
    };
  } catch (error) {
    pairResult.value = {
      ok: false,
      message: getErrorMessage(error, t("devices.addDeviceModal.pairCode.pairFailed")),
      connectOk: false,
      connectMessage: t("devices.addDeviceModal.pairCode.connectSkipped"),
    };
  } finally {
    pairPending.value = false;
  }
}

function enterPairCodeStep() {
  step.value = "android-pair-code";
  pairResult.value = null;
}

function backToPlatforms() {
  step.value = "platforms";
}
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
                : step === "android-pair-code"
                  ? t("devices.addDeviceModal.pairCode.title")
                : t("devices.addDeviceModal.title")
            }}
          </h2>
          <p>
            {{
              step === "android-usb"
                ? t("devices.addDeviceModal.usb.desc")
                : step === "android-pair-code"
                  ? t("devices.addDeviceModal.pairCode.desc")
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
              <button
                v-else-if="item.id === 'android' && mode === 'pairCode'"
                type="button"
                class="add-device-modal__mode-btn"
                @click="enterPairCodeStep"
              >
                <span>{{ t(`devices.addDeviceModal.androidModes.${mode}`) }}</span>
                <span class="add-device-modal__mode-badge">
                  {{ t("devices.addDeviceModal.pairCode.action") }}
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

      <div v-else-if="step === 'android-usb'" class="add-device-modal__usb">
        <div class="add-device-modal__usb-layout">
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
            <p v-if="trackedDevices.length === 0" class="add-device-modal__usb-empty">
              {{ t("devices.addDeviceModal.usb.empty") }}
            </p>
            <ul v-else class="add-device-modal__usb-list">
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

      <div v-else-if="step === 'android-pair-code'" class="add-device-modal__pair-code">
        <div class="add-device-modal__pair-hint">
          <h3>{{ t("devices.addDeviceModal.pairCode.stepsTitle") }}</h3>
          <ol>
            <li>{{ t("devices.addDeviceModal.pairCode.stepDevOptions") }}</li>
            <li>{{ t("devices.addDeviceModal.pairCode.stepWirelessDebug") }}</li>
            <li>{{ t("devices.addDeviceModal.pairCode.stepUsePairCode") }}</li>
          </ol>
        </div>

        <form class="add-device-modal__pair-form" @submit.prevent="submitPairCode">
          <label>
            <span>{{ t("devices.addDeviceModal.pairCode.ipPort") }}</span>
            <div class="add-device-modal__pair-row">
              <input
                v-model.trim="pairForm.host"
                type="text"
                required
                :placeholder="t('devices.addDeviceModal.pairCode.ipPlaceholder')"
              />
              <input
                v-model.trim="pairForm.port"
                type="number"
                min="1"
                max="65535"
                required
                :placeholder="t('devices.addDeviceModal.pairCode.portPlaceholder')"
              />
            </div>
          </label>
          <label>
            <span>{{ t("devices.addDeviceModal.pairCode.codeLabel") }}</span>
            <input
              v-model.trim="pairForm.pairingCode"
              type="text"
              required
              :placeholder="t('devices.addDeviceModal.pairCode.codePlaceholder')"
            />
          </label>

          <div class="add-device-modal__pair-actions">
            <button type="button" class="ghost-button" @click="backToPlatforms">
              {{ t("common.back") }}
            </button>
            <button type="submit" class="primary-button" :disabled="pairPending">
              {{
                pairPending
                  ? t("devices.addDeviceModal.pairCode.pairing")
                  : t("devices.addDeviceModal.pairCode.submit")
              }}
            </button>
          </div>
        </form>

        <div v-if="pairResult" class="add-device-modal__pair-result">
          <p :class="pairResult.ok ? 'result-ok' : 'result-fail'">
            {{ pairResult.ok ? t("devices.addDeviceModal.pairCode.pairSuccess") : t("devices.addDeviceModal.pairCode.pairFailed") }}
            ：{{ pairResult.message }}
          </p>
          <p :class="pairResult.connectOk ? 'result-ok' : 'result-fail'">
            {{
              pairResult.connectOk
                ? t("devices.addDeviceModal.pairCode.connectSuccess")
                : t("devices.addDeviceModal.pairCode.connectFailed")
            }}
            ：{{ pairResult.connectMessage }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
