<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import "../assets/group-control.css";
import AppIcon from "./AppIcon.vue";
import GroupControlCastSlot from "./GroupControlCastSlot.vue";
import GroupControlDevicePickerModal from "./GroupControlDevicePickerModal.vue";

const GRID_STORAGE_KEY = "cloud-phone.group-control.grid";
const ACTIVE_STORAGE_KEY = "cloud-phone.group-control.active";
const LEGACY_STORAGE_KEY = "cloud-phone.group-control.serials";

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
const gridSerials = ref([]);
const activeSerials = ref([]);
const stateInitialized = ref(false);
let previousGridSerials = new Set();

const onlineDevices = computed(() => props.devices.filter((device) => device.connected));

const onlineSerialSet = computed(
  () => new Set(onlineDevices.value.map((device) => device.serial)),
);

const gridDevices = computed(() => {
  const serialSet = new Set(gridSerials.value);

  return props.devices.filter((device) => serialSet.has(device.serial));
});

const activeSet = computed(() => new Set(activeSerials.value));

const showEmptyState = computed(
  () => !gridDevices.value.length && !props.loading && !props.error,
);

function readStoredSerials(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter(Boolean);
  } catch {
    return null;
  }
}

function persistGridSerials(serials) {
  localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(serials));
}

function persistActiveSerials(serials) {
  localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(serials));
}

function defaultGridSerials() {
  return onlineDevices.value.map((device) => device.serial);
}

function syncActiveWithGrid(grid, previousGrid) {
  const gridSet = new Set(grid);
  const next = new Set(activeSerials.value.filter((serial) => gridSet.has(serial)));

  for (const serial of grid) {
    if (!previousGrid.has(serial)) {
      next.add(serial);
    }
  }

  const merged = [...next];

  if (
    merged.length !== activeSerials.value.length ||
    merged.some((serial, index) => serial !== activeSerials.value[index])
  ) {
    activeSerials.value = merged;
    persistActiveSerials(merged);
  }
}

function initializeState() {
  const available = onlineSerialSet.value;
  let grid = readStoredSerials(GRID_STORAGE_KEY);
  let active = readStoredSerials(ACTIVE_STORAGE_KEY);

  if (grid === null) {
    const legacy = readStoredSerials(LEGACY_STORAGE_KEY);

    if (legacy !== null) {
      grid = legacy.filter((serial) => available.has(serial));
    }
  }

  if (grid === null) {
    grid = defaultGridSerials();
  } else {
    grid = grid.filter((serial) => available.has(serial) || props.devices.some((d) => d.serial === serial));
  }

  gridSerials.value = grid;
  previousGridSerials = new Set(grid);
  persistGridSerials(grid);

  if (active === null) {
    active = grid.filter((serial) => available.has(serial));
  } else {
    const gridSet = new Set(grid);
    active = active.filter((serial) => gridSet.has(serial));
  }

  activeSerials.value = active;
  persistActiveSerials(active);
  stateInitialized.value = true;
}

function syncGridWithDevices() {
  if (!stateInitialized.value) {
    initializeState();
    return;
  }

  const known = new Set(props.devices.map((device) => device.serial));
  const nextGrid = gridSerials.value.filter((serial) => known.has(serial));

  if (nextGrid.length !== gridSerials.value.length) {
    const previousGrid = new Set(gridSerials.value);
    gridSerials.value = nextGrid;
    previousGridSerials = new Set(nextGrid);
    persistGridSerials(nextGrid);
    syncActiveWithGrid(nextGrid, previousGrid);
    return;
  }

  const availableOnline = onlineSerialSet.value;
  const mergedGrid = [...nextGrid];
  let gridChanged = false;

  for (const serial of availableOnline) {
    if (!previousGridSerials.has(serial) && !mergedGrid.includes(serial)) {
      mergedGrid.push(serial);
      gridChanged = true;
    }
  }

  if (gridChanged) {
    const previousGrid = new Set(gridSerials.value);
    gridSerials.value = mergedGrid;
    previousGridSerials = new Set(mergedGrid);
    persistGridSerials(mergedGrid);
    syncActiveWithGrid(mergedGrid, previousGrid);
  }
}

function handleConfirmGridSelection(serials) {
  const previousGrid = new Set(gridSerials.value);
  gridSerials.value = serials;
  previousGridSerials = new Set(serials);
  persistGridSerials(serials);
  syncActiveWithGrid(serials, previousGrid);
  showPicker.value = false;
}

function toggleDeviceActive(serial) {
  const next = new Set(activeSerials.value);

  if (next.has(serial)) {
    next.delete(serial);
  } else {
    next.add(serial);
  }

  activeSerials.value = [...next];
  persistActiveSerials(activeSerials.value);
}

function selectAllActive() {
  const onlineGrid = gridDevices.value
    .filter((device) => device.connected)
    .map((device) => device.serial);
  activeSerials.value = onlineGrid;
  persistActiveSerials(onlineGrid);
}

function deselectAllActive() {
  activeSerials.value = [];
  persistActiveSerials([]);
}

function isDeviceActive(serial) {
  return activeSet.value.has(serial);
}

watch(
  () => props.devices,
  () => {
    syncGridWithDevices();
  },
  { immediate: true, deep: true },
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
      <div class="panel-header__actions panel-header__actions--row group-control-toolbar">
        <span v-if="gridDevices.length" class="status-pill">
          {{ t("groupControl.deviceCount", { count: activeSerials.length }) }}
        </span>
        <template v-if="gridDevices.length">
          <button type="button" class="ghost-button" @click="selectAllActive">
            {{ t("groupControl.selectAll") }}
          </button>
          <button type="button" class="ghost-button" @click="deselectAllActive">
            {{ t("groupControl.deselectAll") }}
          </button>
        </template>
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

    <div v-else-if="gridDevices.length" class="group-control-grid">
      <GroupControlCastSlot
        v-for="device in gridDevices"
        :key="device.serial"
        :device="device"
        :selected="isDeviceActive(device.serial)"
        :screenshot-url="screenshotUrl(device.serial)"
        @toggle-select="toggleDeviceActive(device.serial)"
      />
    </div>

    <GroupControlDevicePickerModal
      v-if="showPicker"
      :devices="devices"
      :selected-serials="gridSerials"
      :screenshot-url="screenshotUrl"
      @close="showPicker = false"
      @confirm="handleConfirmGridSelection"
    />
  </section>
</template>
