<script setup>
import { computed, onMounted, watch } from "vue";

import {
  DISPLAY_IME_POLICIES,
  NEW_DISPLAY_CUSTOM,
  NEW_DISPLAY_MAIN,
  NEW_DISPLAY_OFF,
  NEW_DISPLAY_PRESET_GROUPS,
} from "../../utils/mirror-screen-constants.js";
import {
  applyNewDisplaySelect,
  ensureSuggestedDpi,
  isNewDisplayEnabled,
} from "../../utils/mirror-screen-utils.js";

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

const newDisplayActive = computed(() => isNewDisplayEnabled(props.screen));

const showNewDisplayDetails = computed(() => {
  const select = String(props.screen.newDisplaySelect ?? "");

  return (
    select === NEW_DISPLAY_CUSTOM ||
    (select.includes("x") && select.includes("/"))
  );
});

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

function onNewDisplaySelectChange(value) {
  applyNewDisplaySelect(props.screen, value);
  ensureSuggestedDpi(props.screen);
}

watch(
  () => [props.screen.newDisplayWidth, props.screen.newDisplayHeight],
  () => ensureSuggestedDpi(props.screen),
  { immediate: true },
);

watch(
  () => props.screen.newDisplayDpiManual,
  (manual) => {
    if (!manual) {
      ensureSuggestedDpi(props.screen);
    }
  },
);

onMounted(() => {
  const select = String(props.screen.newDisplaySelect ?? "");

  if (select) {
    onNewDisplaySelectChange(select);
  } else if (props.screen.useNewDisplay) {
    onNewDisplaySelectChange(NEW_DISPLAY_CUSTOM);
  }
});
</script>

<template>
  <fieldset class="mirror-settings__group">
    <legend>屏幕</legend>

    <label
      class="mirror-settings__field"
      :class="{ 'mirror-settings__field--disabled': newDisplayActive }"
    >
      <span>投屏屏幕（--display-id）</span>
      <select v-model="screen.displayId" :disabled="newDisplayActive">
        <option v-for="item in displays" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span v-if="newDisplayActive" class="mirror-settings__field-hint">
        已启用新建显示屏，与 --display-id 互斥
      </span>
    </label>

    <label class="mirror-settings__field">
      <span>新建显示屏（--new-display）</span>
      <select
        :value="screen.newDisplaySelect ?? NEW_DISPLAY_OFF"
        @change="onNewDisplaySelectChange(($event.target).value)"
      >
        <option :value="NEW_DISPLAY_OFF">关闭（使用上方 display-id）</option>
        <option :value="NEW_DISPLAY_MAIN">主屏尺寸与密度（--new-display）</option>
        <option :value="NEW_DISPLAY_CUSTOM">自定义分辨率 / DPI</option>
        <optgroup
          v-for="group in NEW_DISPLAY_PRESET_GROUPS"
          :key="group.label"
          :label="group.label"
        >
          <option
            v-for="item in group.options"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </optgroup>
      </select>
    </label>

    <div v-if="showNewDisplayDetails" class="mirror-settings__details-body">
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
        <span>启动应用（--start-app，在上方新建虚拟屏中启动）</span>
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

    <label
      class="mirror-settings__check"
      :class="{ 'mirror-settings__field--disabled': !newDisplayActive }"
    >
      <input v-model="screen.flexDisplay" type="checkbox" :disabled="!newDisplayActive" />
      <span>弹性虚拟屏（--flex-display）</span>
    </label>

    <label
      class="mirror-settings__check"
      :class="{ 'mirror-settings__field--disabled': !newDisplayActive }"
    >
      <input
        v-model="screen.noVdDestroyContent"
        type="checkbox"
        :disabled="!newDisplayActive"
      />
      <span>关闭不销毁内容（--no-vd-destroy-content）</span>
    </label>

    <label
      class="mirror-settings__check"
      :class="{ 'mirror-settings__field--disabled': !newDisplayActive }"
    >
      <input
        v-model="screen.noVdSystemDecorations"
        type="checkbox"
        :disabled="!newDisplayActive"
      />
      <span>无虚拟屏系统装饰（--no-vd-system-decorations）</span>
    </label>

    <label
      class="mirror-settings__field"
      :class="{ 'mirror-settings__field--disabled': !newDisplayActive }"
    >
      <span>IME 策略（--display-ime-policy）</span>
      <select v-model="screen.displayImePolicy" :disabled="!newDisplayActive">
        <option v-for="item in DISPLAY_IME_POLICIES" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>
  </fieldset>
</template>
