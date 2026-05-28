<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import AddDeviceModal from "./AddDeviceModal.vue";
import AppIcon from "./AppIcon.vue";
import DeviceCard from "./DeviceCard.vue";
import { formatRefreshTime, summarizeDevices } from "../utils/device-format.js";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    required: true,
  },
  error: {
    type: String,
    required: true,
  },
  lastRefreshedAt: {
    type: String,
    default: null,
  },
  adbPath: {
    type: String,
    default: "",
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["refresh", "open-device"]);

const { t } = useI18n();
const showAddDeviceModal = ref(false);

const summary = computed(() => summarizeDevices(props.devices));
const refreshLabel = computed(() => formatRefreshTime(props.lastRefreshedAt));
const showEmptyState = computed(
  () => !props.devices.length && !props.loading && !props.error,
);
const statusText = computed(() => {
  if (props.loading && !props.devices.length) {
    return t("devices.loading");
  }

  if (!props.devices.length) {
    return t("devices.empty");
  }

  return t("devices.onlineSummary", {
    online: summary.value.online,
    total: summary.value.total,
  });
});
</script>

<template>
  <section class="devices-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("devices.eyebrow") }}</p>
        <h2>{{ t("devices.title") }}</h2>
        <p class="panel-header__desc">{{ t("devices.desc") }}</p>
      </div>
      <div class="panel-header__actions panel-header__actions--row">
        <span class="status-pill">{{ statusText }}</span>
        <div class="panel-header__buttons">
          <button
            type="button"
            class="primary-button panel-header__add-device"
            @click="showAddDeviceModal = true"
          >
            <AppIcon name="plus" />
            <span>{{ t("devices.addDevice") }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="devices-toolbar">
      <p class="devices-toolbar__meta">
        <span>{{ t("devices.lastUpdate", { time: refreshLabel }) }}</span>
        <span v-if="adbPath" class="devices-toolbar__adb" :title="adbPath">
          {{ t("devices.adbReady") }}
        </span>
      </p>
      <p v-if="summary.offline > 0" class="devices-toolbar__hint">
        {{ t("devices.offlineHint", { count: summary.offline }) }}
      </p>
    </div>

    <p v-if="error" class="feedback panel-feedback">
      {{ error }}
      <button type="button" class="feedback__retry" @click="emit('refresh')">
        {{ t("common.retry") }}
      </button>
    </p>

    <div v-if="showEmptyState" class="empty-state">
      <p>{{ t("devices.notFound") }}</p>
      <span>{{ t("devices.connectHint") }}</span>
    </div>

    <div v-else-if="devices.length" class="device-gallery">
      <DeviceCard
        v-for="device in devices"
        :key="device.serial"
        :device="device"
        :screenshot-url="screenshotUrl(device.serial)"
        @open="emit('open-device', $event)"
      />
    </div>

    <AddDeviceModal v-if="showAddDeviceModal" @close="showAddDeviceModal = false" />
  </section>
</template>
