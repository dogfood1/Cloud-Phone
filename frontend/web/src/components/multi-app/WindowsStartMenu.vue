<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";

import IconHelperGatePanel from "../IconHelperGatePanel.vue";
import { useIconHelperGate } from "../../composables/useIconHelperGate.js";
import { fetchDeviceLauncherApps } from "../../utils/device-launcher-apps-api.js";
import { getErrorMessage } from "../../utils/api.js";

const emit = defineEmits(["launch"]);

const props = defineProps({
  serial: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const {
  consentDialogOpen,
  phase,
  progress,
  progressPercent,
  showProgressUi,
  packageNamesOnly,
  answerConsent,
  prepareIconHelper,
  syncIconHelper,
} = useIconHelperGate();

const searchQuery = ref("");
const apps = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);
const gateBusy = ref(false);

let inFlight = false;
let loadGeneration = 0;
let syncTimer = null;

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());
const isSearching = computed(() => normalizedQuery.value.length > 0);
const showDeniedHint = computed(
  () => packageNamesOnly.value && hasLoadedOnce.value && !gateBusy.value,
);
const progressLabel = computed(() => {
  if (phase.value === "ensuring") {
    return t("iconHelper.installing");
  }
  if (progress.value.phase === "running") {
    return t("iconHelper.extractingProgress", {
      done: progress.value.done,
      total: progress.value.total || "?",
    });
  }
  return t("iconHelper.extracting");
});

const filteredApps = computed(() => {
  if (!isSearching.value) {
    return apps.value;
  }

  const query = normalizedQuery.value;
  return apps.value.filter((app) => {
    const label = String(app.label || "").toLowerCase();
    const pkg = String(app.packageName || "").toLowerCase();
    return label.includes(query) || pkg.includes(query);
  });
});

watch(
  () => [props.active, props.serial],
  ([isActive]) => {
    if (isActive && props.serial) {
      void bootstrapAndLoad();
      startSyncPoll();
      return;
    }

    stopSyncPoll();
    if (!isActive) {
      searchQuery.value = "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  loadGeneration += 1;
  stopSyncPoll();
});

function startSyncPoll() {
  stopSyncPoll();
  if (!props.serial) {
    return;
  }
  syncTimer = setInterval(() => {
    void syncAndReload();
  }, 12_000);
}

function stopSyncPoll() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

async function syncAndReload() {
  if (!props.serial || !props.active || gateBusy.value) {
    return;
  }
  const result = await syncIconHelper(props.serial);
  if (result?.changed) {
    await loadApps({ initial: false, packageNamesOnly: packageNamesOnly.value });
  }
}

async function bootstrapAndLoad() {
  if (!props.serial || gateBusy.value) {
    return;
  }

  gateBusy.value = true;
  loading.value = !hasLoadedOnce.value;

  try {
    const result = await prepareIconHelper(props.serial);
    await loadApps({
      initial: !hasLoadedOnce.value,
      packageNamesOnly: result.packageNamesOnly,
    });
  } finally {
    gateBusy.value = false;
    loading.value = false;
  }
}

async function loadApps({ initial = false, packageNamesOnly: namesOnly = false } = {}) {
  if (!props.serial || inFlight) {
    return;
  }

  const generation = ++loadGeneration;
  inFlight = true;

  if (initial || !hasLoadedOnce.value) {
    loading.value = true;
  }

  try {
    const rows = await fetchDeviceLauncherApps(props.serial, {
      light: hasLoadedOnce.value && !initial && !namesOnly,
      packageNamesOnly: namesOnly,
    });

    if (generation !== loadGeneration) {
      return;
    }

    apps.value = mergeAppIcons(apps.value, rows);
    errorMessage.value = "";
    hasLoadedOnce.value = true;
  } catch (error) {
    if (generation !== loadGeneration) {
      return;
    }

    if (!hasLoadedOnce.value) {
      apps.value = [];
    }
    errorMessage.value = getErrorMessage(error) || t("iconHelper.loadFailed");
  } finally {
    if (generation === loadGeneration) {
      loading.value = false;
    }
    inFlight = false;
  }
}

function mergeAppIcons(previous, next) {
  const previousIcons = new Map(
    previous
      .filter((item) => item.iconDataUrl)
      .map((item) => [item.packageName, item.iconDataUrl]),
  );

  return next.map((item) => ({
    ...item,
    iconDataUrl: item.iconDataUrl || previousIcons.get(item.packageName) || null,
  }));
}

function initialsFor(app) {
  const source = app.label || app.packageName || "?";
  return String(source).trim().slice(0, 1).toUpperCase();
}

function displayName(app) {
  return packageNamesOnly.value ? app.packageName : app.label || app.packageName;
}

function launchApp(app) {
  emit("launch", {
    packageName: app.packageName,
    activity: app.activity,
    label: displayName(app),
    iconDataUrl: packageNamesOnly.value ? null : app.iconDataUrl || null,
  });
}
</script>

<template>
  <div class="win11-start-menu">
    <IconHelperGatePanel
      :consent-open="consentDialogOpen"
      :busy="showProgressUi"
      :progress-percent="progressPercent"
      :progress-label="progressLabel"
      :current-package="progress.current"
      :denied-hint="showDeniedHint"
      @allow="answerConsent(true)"
      @deny="answerConsent(false)"
    />

    <div class="win11-start-menu__search">
      <Icon icon="lucide:search" class="win11-start-menu__search-icon" :width="16" :height="16" />
      <input
        v-model="searchQuery"
        class="win11-start-menu__search-input"
        type="search"
        :placeholder="t('iconHelper.searchApps')"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <div class="win11-start-menu__body">
      <p v-if="loading && !hasLoadedOnce && !gateBusy" class="win11-start-menu__status">
        {{ t("iconHelper.loadingApps") }}
      </p>
      <p v-else-if="errorMessage && !apps.length" class="win11-start-menu__status is-error">
        {{ errorMessage }}
      </p>
      <p v-else-if="isSearching && !filteredApps.length" class="win11-start-menu__status">
        {{ t("iconHelper.noMatch") }}
      </p>
      <p v-else-if="!filteredApps.length && !gateBusy && !loading" class="win11-start-menu__status">
        {{ t("iconHelper.emptyApps") }}
      </p>

      <ul v-else-if="isSearching && filteredApps.length" class="win11-start-menu__search-list">
        <li v-for="app in filteredApps" :key="`${app.packageName}:${app.activity}`">
          <button type="button" class="win11-start-menu__search-item" @click="launchApp(app)">
            <span class="win11-start-menu__search-icon-wrap" aria-hidden="true">
              <img v-if="app.iconDataUrl && !packageNamesOnly" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__search-text">
              <strong>{{ displayName(app) }}</strong>
              <small>{{ t("iconHelper.appKind") }}</small>
            </span>
          </button>
        </li>
      </ul>

      <template v-else-if="filteredApps.length">
        <div class="win11-start-menu__grid">
          <button
            v-for="app in filteredApps"
            :key="`${app.packageName}:${app.activity}`"
            type="button"
            class="win11-start-menu__app"
            :title="displayName(app)"
            @click="launchApp(app)"
          >
            <span class="win11-start-menu__app-icon" aria-hidden="true">
              <img v-if="app.iconDataUrl && !packageNamesOnly" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__app-name">{{ displayName(app) }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
