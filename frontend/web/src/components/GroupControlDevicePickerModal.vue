<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import "../assets/group-control.css";
import GroupControlDevicePreview from "./GroupControlDevicePreview.vue";

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  selectedSerials: {
    type: Array,
    required: true,
  },
  screenshotUrl: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);

const { t } = useI18n();
const draftSelection = ref(new Set());

const availableDevices = computed(() => props.devices.filter((device) => device.connected));

const allSelected = computed(() => {
  const list = availableDevices.value;

  return list.length > 0 && list.every((device) => draftSelection.value.has(device.serial));
});

const selectedCount = computed(() => draftSelection.value.size);

watch(
  () => props.selectedSerials,
  (serials) => {
    draftSelection.value = new Set(serials);
  },
  { immediate: true },
);

function isSelected(serial) {
  return draftSelection.value.has(serial);
}

function toggleDevice(serial) {
  const next = new Set(draftSelection.value);

  if (next.has(serial)) {
    next.delete(serial);
  } else {
    next.add(serial);
  }

  draftSelection.value = next;
}

function toggleSelectAll() {
  if (allSelected.value) {
    draftSelection.value = new Set();
    return;
  }

  draftSelection.value = new Set(availableDevices.value.map((device) => device.serial));
}

function handleConfirm() {
  emit("confirm", [...draftSelection.value]);
}
</script>

<template>
  <div class="modal-layer" @click.self="emit('close')">
    <section
      class="group-control-picker"
      role="dialog"
      aria-modal="true"
      :aria-label="t('groupControl.picker.title')"
    >
      <header class="group-control-picker__header">
        <div>
          <h2>{{ t("groupControl.picker.title") }}</h2>
          <p>{{ t("groupControl.picker.desc") }}</p>
        </div>
        <button
          type="button"
          class="group-control-picker__close"
          :aria-label="t('groupControl.picker.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div v-if="availableDevices.length" class="group-control-picker__toolbar">
        <label class="group-control-picker__select-all">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="selectedCount > 0 && !allSelected"
            @change="toggleSelectAll"
          />
          <span>{{
            allSelected
              ? t("groupControl.picker.deselectAll")
              : t("groupControl.picker.selectAll")
          }}</span>
        </label>
        <span class="group-control-picker__count">
          {{ t("groupControl.picker.selectedCount", { count: selectedCount }) }}
        </span>
      </div>

      <div v-if="!availableDevices.length" class="group-control-picker__empty">
        <p>{{ t("groupControl.picker.noDevices") }}</p>
        <span>{{ t("groupControl.picker.noDevicesHint") }}</span>
      </div>

      <ul v-else class="group-control-picker__list">
        <li v-for="device in availableDevices" :key="device.serial">
          <label
            class="group-control-picker__item"
            :class="{ 'group-control-picker__item--selected': isSelected(device.serial) }"
          >
            <input
              type="checkbox"
              :checked="isSelected(device.serial)"
              @change="toggleDevice(device.serial)"
            />
            <GroupControlDevicePreview
              :device="device"
              :screenshot-url="screenshotUrl(device.serial)"
              compact
            />
            <span class="group-control-picker__name">{{ device.displayName }}</span>
          </label>
        </li>
      </ul>

      <footer class="group-control-picker__footer">
        <button type="button" class="ghost-button" @click="emit('close')">
          {{ t("groupControl.picker.cancel") }}
        </button>
        <button
          type="button"
          class="primary-button"
          :disabled="!availableDevices.length"
          @click="handleConfirm"
        >
          {{ t("groupControl.picker.confirm") }}
        </button>
      </footer>
    </section>
  </div>
</template>
