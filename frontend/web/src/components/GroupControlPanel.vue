<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import "../assets/group-control.css";
import AppIcon from "./AppIcon.vue";
import GroupControlCastSlot from "./GroupControlCastSlot.vue";
import GroupControlDevicePickerModal from "./GroupControlDevicePickerModal.vue";
import { GROUP_CONTROL_START_STAGGER_MS } from "../utils/group-control-cast-options.js";

const STORAGE_KEY = "cloud-phone.group-control.serials";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["refresh"]);

const { t } = useI18n();
const showPicker = ref(false);
const selectedSerials = ref(loadSelectedSerials());

const selectedDevices = computed(() => {
  const serialSet = new Set(selectedSerials.value);

  return props.devices.filter((device) => serialSet.has(device.serial));
});

const showEmptyState = computed(
  () => !selectedDevices.value.length && !props.loading && !props.error,
);

function loadSelectedSerials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistSelectedSerials(serials) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serials));
}

function handleConfirmSelection(serials) {
  selectedSerials.value = serials;
  persistSelectedSerials(serials);
  showPicker.value = false;
}

function removeDevice(serial) {
  const next = selectedSerials.value.filter((item) => item !== serial);
  selectedSerials.value = next;
  persistSelectedSerials(next);
}

watch(
  () => props.devices,
  (devices) => {
    const known = new Set(devices.map((device) => device.serial));
    const next = selectedSerials.value.filter((serial) => known.has(serial));

    if (next.length !== selectedSerials.value.length) {
      selectedSerials.value = next;
      persistSelectedSerials(next);
    }
  },
  { deep: true },
);
</script>

<template>
  <section class="group-control-view">
    <header class="panel-header">
      <div>
        <p class="eyebrow">{{ t("groupControl.eyebrow") }}</p>
        <h2>{{ t("groupControl.title") }}</h2>
        <p class="panel-header__desc">{{ t("groupControl.desc") }}</p>
      </div>
      <div class="panel-header__actions panel-header__actions--row">
        <span v-if="selectedDevices.length" class="status-pill">
          {{ t("groupControl.deviceCount", { count: selectedDevices.length }) }}
        </span>
        <button
          type="button"
          class="panel-header__add-device"
          :aria-label="t('groupControl.addDevice')"
          :title="t('groupControl.addDevice')"
          @click="showPicker = true"
        >
          <AppIcon name="plus" />
        </button>
      </div>
    </header>

    <p v-if="error" class="feedback panel-feedback">
      {{ error }}
      <button type="button" class="feedback__retry" @click="emit('refresh')">
        {{ t("common.retry") }}
      </button>
    </p>

    <div v-if="showEmptyState" class="empty-state">
      <p>{{ t("groupControl.empty") }}</p>
      <span>{{ t("groupControl.emptyHint") }}</span>
    </div>

    <div v-else-if="selectedDevices.length" class="group-control-grid">
      <GroupControlCastSlot
        v-for="(device, index) in selectedDevices"
        :key="device.serial"
        :device="device"
        :start-delay-ms="index * GROUP_CONTROL_START_STAGGER_MS"
        @remove="removeDevice"
      />
    </div>

    <GroupControlDevicePickerModal
      v-if="showPicker"
      :devices="devices"
      :selected-serials="selectedSerials"
      :screenshot-url="screenshotUrl"
      @close="showPicker = false"
      @confirm="handleConfirmSelection"
    />
  </section>
</template>
