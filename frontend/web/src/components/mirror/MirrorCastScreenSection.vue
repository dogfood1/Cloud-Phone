<script setup>
import { computed, watch } from "vue";

import { suggestDpi } from "../../utils/mirror-cast-constants.js";

const props = defineProps({
  screen: {
    type: Object,
    required: true,
  },
  displays: {
    type: Array,
    required: true,
  },
  apps: {
    type: Array,
    required: true,
  },
});

const appQuery = defineModel("appQuery", { type: String, default: "" });

const filteredApps = computed(() => {
  const keyword = appQuery.value.trim().toLowerCase();

  if (!keyword) {
    return props.apps;
  }

  return props.apps.filter((app) => {
    const label = `${app.label} ${app.packageName ?? app.value}`.toLowerCase();
    return label.includes(keyword);
  });
});

function applySuggestedDpi() {
  if (props.screen.newDisplayDpiManual) {
    return;
  }

  props.screen.newDisplayDpi = suggestDpi(
    props.screen.newDisplayWidth,
    props.screen.newDisplayHeight,
  );
}

watch(
  () => [props.screen.newDisplayWidth, props.screen.newDisplayHeight],
  applySuggestedDpi,
  { immediate: true },
);

watch(
  () => props.screen.newDisplayDpiManual,
  (manual) => {
    if (!manual) {
      applySuggestedDpi();
    }
  },
);
</script>

<template>
  <fieldset class="mirror-settings__group">
    <legend>屏幕</legend>

    <label class="mirror-settings__field">
      <span>投屏屏幕</span>
      <select v-model="screen.displayId">
        <option v-for="item in displays" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <details class="mirror-settings__details">
      <summary>新建显示屏</summary>

      <div class="mirror-settings__details-body">
        <div class="mirror-settings__field mirror-settings__field--inline">
          <span>分辨率</span>
          <div class="mirror-settings__resolution">
            <input
              v-model.number="screen.newDisplayWidth"
              type="number"
              min="320"
              max="7680"
              step="1"
            />
            <span>x</span>
            <input
              v-model.number="screen.newDisplayHeight"
              type="number"
              min="320"
              max="7680"
              step="1"
            />
          </div>
        </div>

        <label class="mirror-settings__field">
          <span>DPI</span>
          <input
            v-model.number="screen.newDisplayDpi"
            type="number"
            min="120"
            max="640"
            step="1"
            :readonly="!screen.newDisplayDpiManual"
            @focus="screen.newDisplayDpiManual = true"
          />
        </label>
        <label class="mirror-settings__check">
          <input v-model="screen.newDisplayDpiManual" type="checkbox" />
          <span>手动设置 DPI</span>
        </label>

        <label class="mirror-settings__field">
          <span>应用</span>
          <input
            v-model="appQuery"
            type="search"
            class="mirror-settings__search"
            placeholder="搜索应用名称或包名"
          />
          <select v-model="screen.newDisplayApp" class="mirror-settings__select-tall">
            <option value="">不指定应用</option>
            <option
              v-for="app in filteredApps"
              :key="app.value"
              :value="app.value"
            >
              {{ app.label }} — {{ app.packageName ?? app.value }}
            </option>
          </select>
        </label>
      </div>
    </details>
  </fieldset>
</template>
