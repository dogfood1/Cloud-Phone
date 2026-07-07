<script setup>
import { computed, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useI18n } from "vue-i18n";

import { getErrorMessage, requestJson } from "../utils/api.js";

const props = defineProps({
  onBack: {
    type: Function,
    default: null,
  },
  onConnected: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const mode = ref("scan");
const scanning = ref(false);
const discovered = ref([]);
const connectPending = ref(false);
const connectResult = ref(null);
const manualForm = ref({
  host: "",
  httpPort: "8100",
  mjpegPort: "9100",
});

const scanSummary = computed(() => ({
  total: discovered.value.length,
  online: discovered.value.filter((item) => item.connected !== false && item.state !== "offline").length,
}));

async function scanLan() {
  scanning.value = true;
  connectResult.value = null;

  try {
    const result = await requestJson("/api/devices/ios/discover?timeout=4000");
    discovered.value = result.devices ?? [];
  } catch (error) {
    connectResult.value = {
      ok: false,
      message: getErrorMessage(error, t("devices.addDeviceModal.apple.scanFailed")),
    };
    discovered.value = [];
  } finally {
    scanning.value = false;
  }
}

async function connectEndpoint(endpoint, meta = {}) {
  connectPending.value = true;
  connectResult.value = null;

  try {
    const result = await requestJson("/api/devices/ios/connect", {
      method: "POST",
      body: {
        host: endpoint.host,
        httpPort: Number(endpoint.httpPort),
        mjpegPort: Number(endpoint.mjpegPort),
        name: meta.name,
        udid: meta.udid,
        source: meta.source ?? "manual",
      },
    });

    connectResult.value = {
      ok: true,
      message: result.device?.displayName || result.device?.serial,
      device: result.device,
    };
    props.onConnected?.(result.device);
  } catch (error) {
    connectResult.value = {
      ok: false,
      message: getErrorMessage(error, t("devices.addDeviceModal.apple.connectFailed")),
    };
  } finally {
    connectPending.value = false;
  }
}

async function connectDiscovered(device) {
  if (!device?.endpoint) {
    return;
  }

  await connectEndpoint(device.endpoint, {
    name: device.displayName,
    udid: device.udid,
    source: "mdns",
  });
}

async function submitManual() {
  const host = manualForm.value.host.trim();
  const httpPort = Number.parseInt(manualForm.value.httpPort, 10);
  const mjpegPort = Number.parseInt(manualForm.value.mjpegPort, 10);

  if (!host || !httpPort || !mjpegPort) {
    connectResult.value = {
      ok: false,
      message: t("devices.addDeviceModal.apple.manualInvalid"),
    };
    return;
  }

  await connectEndpoint({ host, httpPort, mjpegPort }, { source: "manual" });
}

onMounted(() => {
  void scanLan();
});
</script>

<template>
  <div class="apple-panel">
    <div class="apple-panel__hero" aria-hidden="true">
      <div class="apple-panel__glow" />
      <Icon icon="mdi:apple" class="apple-panel__hero-icon" />
      <div class="apple-panel__rings">
        <span />
        <span />
        <span />
      </div>
    </div>

    <div class="apple-panel__content">
      <div class="apple-panel__tabs" role="tablist">
        <button
          type="button"
          class="apple-panel__tab"
          :class="{ 'apple-panel__tab--active': mode === 'scan' }"
          @click="mode = 'scan'; scanLan()"
        >
          <Icon icon="lucide:radar" />
          {{ t("devices.addDeviceModal.apple.tabs.scan") }}
        </button>
        <button
          type="button"
          class="apple-panel__tab"
          :class="{ 'apple-panel__tab--active': mode === 'manual' }"
          @click="mode = 'manual'"
        >
          <Icon icon="lucide:keyboard" />
          {{ t("devices.addDeviceModal.apple.tabs.manual") }}
        </button>
      </div>

      <aside class="apple-panel__guide">
        <h3>{{ t("devices.addDeviceModal.apple.guideTitle") }}</h3>
        <ol>
          <li>{{ t("devices.addDeviceModal.apple.guideStep1") }}</li>
          <li>{{ t("devices.addDeviceModal.apple.guideStep2") }}</li>
          <li>{{ t("devices.addDeviceModal.apple.guideStep3") }}</li>
          <li>{{ t("devices.addDeviceModal.apple.guideStep4") }}</li>
        </ol>
        <p class="apple-panel__guide-note">{{ t("devices.addDeviceModal.apple.guideNote") }}</p>
      </aside>

      <div v-if="mode === 'scan'" class="apple-panel__scan">
        <div class="apple-panel__scan-toolbar">
          <p>
            {{
              t("devices.addDeviceModal.apple.scanSummary", {
                total: scanSummary.total,
                online: scanSummary.online,
              })
            }}
          </p>
          <button type="button" class="ghost-button" :disabled="scanning" @click="scanLan">
            <Icon :icon="scanning ? 'lucide:loader-circle' : 'lucide:refresh-cw'" />
            {{
              scanning
                ? t("devices.addDeviceModal.apple.scanning")
                : t("devices.addDeviceModal.apple.rescan")
            }}
          </button>
        </div>

        <p v-if="!scanning && discovered.length === 0" class="apple-panel__empty">
          {{ t("devices.addDeviceModal.apple.scanEmpty") }}
        </p>

        <ul v-else class="apple-panel__list">
          <li v-for="device in discovered" :key="device.serial" class="apple-panel__card-item">
            <div class="apple-panel__card-main">
              <strong>{{ device.displayName || device.serial }}</strong>
              <span>{{ device.endpoint?.host }}:{{ device.endpoint?.httpPort }}</span>
              <span v-if="device.iosVersion" class="apple-panel__meta">
                iOS {{ device.iosVersion }}
              </span>
            </div>
            <button
              type="button"
              class="primary-button"
              :disabled="connectPending || device.state === 'offline'"
              @click="connectDiscovered(device)"
            >
              {{ t("devices.addDeviceModal.apple.connect") }}
            </button>
          </li>
        </ul>
      </div>

      <form v-else class="apple-panel__manual" @submit.prevent="submitManual">
        <label>
          <span>{{ t("devices.addDeviceModal.apple.hostLabel") }}</span>
          <input
            v-model.trim="manualForm.host"
            type="text"
            required
            :placeholder="t('devices.addDeviceModal.apple.hostPlaceholder')"
          />
        </label>
        <div class="apple-panel__manual-row">
          <label>
            <span>{{ t("devices.addDeviceModal.apple.httpPortLabel") }}</span>
            <input v-model.trim="manualForm.httpPort" type="number" min="1" max="65535" required />
          </label>
          <label>
            <span>{{ t("devices.addDeviceModal.apple.mjpegPortLabel") }}</span>
            <input v-model.trim="manualForm.mjpegPort" type="number" min="1" max="65535" required />
          </label>
        </div>
        <p class="apple-panel__manual-hint">{{ t("devices.addDeviceModal.apple.manualHint") }}</p>
        <button type="submit" class="primary-button" :disabled="connectPending">
          {{
            connectPending
              ? t("devices.addDeviceModal.apple.connecting")
              : t("devices.addDeviceModal.apple.connect")
          }}
        </button>
      </form>

      <div v-if="connectResult" class="apple-panel__result" :class="connectResult.ok ? 'is-ok' : 'is-fail'">
        <Icon :icon="connectResult.ok ? 'lucide:check-circle-2' : 'lucide:alert-circle'" />
        <span>{{ connectResult.message }}</span>
      </div>

      <div class="apple-panel__actions">
        <button type="button" class="ghost-button" @click="props.onBack?.()">
          {{ t("common.back") }}
        </button>
      </div>
    </div>
  </div>
</template>
