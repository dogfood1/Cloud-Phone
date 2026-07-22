<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import { fetchDeviceLauncherApps } from "../../utils/device-launcher-apps-api.js";
import { getErrorMessage } from "../../utils/api.js";

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

const searchQuery = ref("");
const apps = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const hasLoadedOnce = ref(false);

let inFlight = false;
let loadGeneration = 0;

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());
const isSearching = computed(() => normalizedQuery.value.length > 0);

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
      void loadApps({ initial: !hasLoadedOnce.value });
      return;
    }

    if (!isActive) {
      searchQuery.value = "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  loadGeneration += 1;
});

async function loadApps({ initial = false } = {}) {
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
      light: hasLoadedOnce.value && !initial,
    });

    if (generation !== loadGeneration) {
      return;
    }

    apps.value = mergeAppIcons(apps.value, rows);
    errorMessage.value = "";
    hasLoadedOnce.value = true;

    if (rows.some((item) => !item.iconDataUrl)) {
      window.setTimeout(() => {
        if (props.active) {
          void loadApps({ initial: false });
        }
      }, 1200);
    }
  } catch (error) {
    if (generation !== loadGeneration) {
      return;
    }

    if (!hasLoadedOnce.value) {
      apps.value = [];
    }
    errorMessage.value = getErrorMessage(error) || "无法加载应用列表";
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
</script>

<template>
  <div class="win11-start-menu">
    <div class="win11-start-menu__search">
      <Icon icon="lucide:search" class="win11-start-menu__search-icon" :width="16" :height="16" />
      <input
        v-model="searchQuery"
        class="win11-start-menu__search-input"
        type="search"
        placeholder="搜索应用"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <div class="win11-start-menu__body">
      <p v-if="loading && !hasLoadedOnce" class="win11-start-menu__status">正在加载应用…</p>
      <p v-else-if="errorMessage && !apps.length" class="win11-start-menu__status is-error">
        {{ errorMessage }}
      </p>
      <p v-else-if="isSearching && !filteredApps.length" class="win11-start-menu__status">
        未找到匹配的应用
      </p>
      <p v-else-if="!filteredApps.length" class="win11-start-menu__status">暂无可用应用</p>

      <ul v-else-if="isSearching" class="win11-start-menu__search-list">
        <li v-for="app in filteredApps" :key="`${app.packageName}:${app.activity}`">
          <button type="button" class="win11-start-menu__search-item">
            <span class="win11-start-menu__search-icon-wrap" aria-hidden="true">
              <img v-if="app.iconDataUrl" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__search-text">
              <strong>{{ app.label }}</strong>
              <small>应用</small>
            </span>
          </button>
        </li>
      </ul>

      <template v-else>
        <div class="win11-start-menu__grid">
          <button
            v-for="app in filteredApps"
            :key="`${app.packageName}:${app.activity}`"
            type="button"
            class="win11-start-menu__app"
            :title="app.label"
          >
            <span class="win11-start-menu__app-icon" aria-hidden="true">
              <img v-if="app.iconDataUrl" :src="app.iconDataUrl" alt="" />
              <span v-else>{{ initialsFor(app) }}</span>
            </span>
            <span class="win11-start-menu__app-name">{{ app.label }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
