<script setup>

import { computed, ref, watch } from "vue";

import { useI18n } from "vue-i18n";



import "../assets/group-control.css";

import { useGroupControlBatch } from "../composables/useGroupControlBatch.js";

import AppIcon from "./AppIcon.vue";
import PageHeader from "./ui/PageHeader.vue";
import PanelAlert from "./ui/PanelAlert.vue";
import UiButton from "./ui/UiButton.vue";

import GroupControlActionBar from "./GroupControlActionBar.vue";

import GroupControlAppBatchModal from "./GroupControlAppBatchModal.vue";

import GroupControlCastSlot from "./GroupControlCastSlot.vue";

import GroupControlDevicePickerModal from "./GroupControlDevicePickerModal.vue";

import GroupControlMasterModal from "./GroupControlMasterModal.vue";

import GroupControlResultModal from "./GroupControlResultModal.vue";
import {
  getCachedRuntimeState,
  persistLocalStatePatch,
} from "../utils/local-persistence-state.js";



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

const appBusy = ref(false);

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



const activeDevices = computed(() =>

  gridDevices.value.filter(

    (device) => device.connected && activeSet.value.has(device.serial),

  ),

);



const showEmptyState = computed(

  () => !gridDevices.value.length && !props.loading && !props.error,

);



const {

  batchMode,

  masterSerial,

  showAppModal,

  showMasterModal,

  showResultModal,

  resultTitle,

  resultLines,

  registerSlot,

  broadcastNavigation,

  stopBatchMode,

  startBatchMode,

  handleControlRelay,

  getBatchRole,

  showResults,

  runBatchInstall,

  runBatchUninstall,

} = useGroupControlBatch({ activeDevicesRef: activeDevices });



function persistGridSerials(serials) {
  void persistLocalStatePatch({
    runtimeState: {
      groupControlGridSerials: serials,
    },
  });
}



function persistActiveSerials(serials) {
  void persistLocalStatePatch({
    runtimeState: {
      groupControlActiveSerials: serials,
    },
  });
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
  const persisted = getCachedRuntimeState();
  let grid = Array.isArray(persisted.groupControlGridSerials)
    ? persisted.groupControlGridSerials.filter(Boolean)
    : null;
  let active = Array.isArray(persisted.groupControlActiveSerials)
    ? persisted.groupControlActiveSerials.filter(Boolean)
    : null;

  if (!grid?.length) {
    grid = defaultGridSerials();
  } else {
    grid = grid.filter(
      (serial) =>
        available.has(serial) || props.devices.some((device) => device.serial === serial),
    );
  }
  gridSerials.value = grid;
  previousGridSerials = new Set(grid);
  persistGridSerials(grid);
  if (!active?.length) {
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



function formatResultLine(line) {

  const key = `groupControl.resultModal.${line.kind}`;

  const base = t(key);



  if (line.detail) {

    return `${base}：${line.detail}`;

  }



  return base;

}



function showBatchResults(titleKey, lines) {

  showResults(

    t(titleKey),

    lines.map((line) => ({

      serial: line.serial,

      ok: line.ok,

      message: formatResultLine(line),

    })),

  );

}



async function handleBatchInstall(file) {

  appBusy.value = true;



  try {

    const lines = await runBatchInstall(file);

    showAppModal.value = false;

    showBatchResults("groupControl.resultModal.installTitle", lines);

  } finally {

    appBusy.value = false;

  }

}



async function handleBatchUninstall(packageName) {

  appBusy.value = true;



  try {

    const lines = await runBatchUninstall(packageName);

    showAppModal.value = false;

    showBatchResults("groupControl.resultModal.uninstallTitle", lines);

  } finally {

    appBusy.value = false;

  }

}



watch(

  () => props.devices,

  () => {

    syncGridWithDevices();

  },

  { immediate: true, deep: true },

);



watch(activeSerials, (serials) => {

  if (!serials.length) {

    stopBatchMode();

    return;

  }



  if (batchMode.value && !serials.includes(masterSerial.value)) {

    stopBatchMode();

  }

});

</script>



<template>

  <section class="group-control-view">

    <PageHeader
      :eyebrow="t('groupControl.eyebrow')"
      :title="t('groupControl.title')"
      :help="t('groupControl.desc')"
    >
      <template #actions>
        <span v-if="gridDevices.length" class="status-pill">
          {{ t("groupControl.deviceCount", { count: activeSerials.length }) }}
        </span>
        <template v-if="gridDevices.length">
          <UiButton variant="ghost" size="small" @click="selectAllActive">
            {{ t("groupControl.selectAll") }}
          </UiButton>
          <UiButton variant="ghost" size="small" @click="deselectAllActive">
            {{ t("groupControl.deselectAll") }}
          </UiButton>
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
      </template>
    </PageHeader>



    <GroupControlActionBar

      v-if="activeSerials.length"

      :batch-mode="batchMode"

      @power="broadcastNavigation"

      @volume="broadcastNavigation"

      @open-apps="showAppModal = true"

      @open-batch="showMasterModal = true"

      @stop-batch="stopBatchMode"

    />



    <PanelAlert
      v-if="error"
      type="error"
      :message="error"
      :action-label="t('common.retry')"
      @action="emit('refresh')"
    />



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

        :batch-mode="batchMode"

        :batch-role="getBatchRole(device.serial)"

        :register-slot="registerSlot"

        @toggle-select="toggleDeviceActive(device.serial)"

        @control-relay="handleControlRelay"

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



    <GroupControlAppBatchModal

      v-if="showAppModal"

      :device-count="activeDevices.length"

      :busy="appBusy"

      @close="showAppModal = false"

      @install="handleBatchInstall"

      @uninstall="handleBatchUninstall"

    />



    <GroupControlMasterModal

      v-if="showMasterModal"

      :devices="activeDevices"

      :screenshot-url="screenshotUrl"

      @close="showMasterModal = false"

      @confirm="startBatchMode"

    />



    <GroupControlResultModal

      v-if="showResultModal"

      :title="resultTitle"

      :lines="resultLines"

      @close="showResultModal = false"

    />

  </section>

</template>

