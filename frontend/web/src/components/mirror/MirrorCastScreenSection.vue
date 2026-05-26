<script setup>
import { computed, onMounted, watch } from "vue";
import { NCollapseItem, NDivider, NForm, NInputNumber, NSwitch } from "naive-ui";
import MirrorSearchableSelect from "./MirrorSearchableSelect.vue";

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
import MirrorSettingRow from "./MirrorSettingRow.vue";

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

const newDisplayActive = computed(() => isNewDisplayEnabled(props.screen));

const showNewDisplayDetails = computed(() => {
  const select = String(props.screen.newDisplaySelect ?? "");

  return (
    select === NEW_DISPLAY_CUSTOM ||
    (select.includes("x") && select.includes("/"))
  );
});

const displayOptions = computed(() =>
  props.displays.map((item) => ({ label: item.label, value: item.value })),
);

const newDisplaySelectOptions = computed(() => {
  const options = [
    { label: "关闭（使用 display-id）", value: NEW_DISPLAY_OFF },
    { label: "主屏尺寸与密度", value: NEW_DISPLAY_MAIN },
    { label: "自定义分辨率 / DPI", value: NEW_DISPLAY_CUSTOM },
  ];

  for (const group of NEW_DISPLAY_PRESET_GROUPS) {
    options.push({
      type: "group",
      label: group.label,
      key: group.label,
      children: group.options.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    });
  }

  return options;
});

const imePolicyOptions = computed(() =>
  DISPLAY_IME_POLICIES.map((item) => ({ label: item.label, value: item.value })),
);

const appSelectOptions = computed(() => [
  { label: "不指定应用", value: "" },
  ...props.apps.map((app) => ({
    label: `${app.label} — ${app.packageName ?? app.value}`,
    value: app.value,
  })),
]);

const displayIdHelp = computed(() => {
  if (newDisplayActive.value) {
    return "已启用新建虚拟屏，与 --display-id 互斥，将忽略此项。";
  }
  return "对应 --display-id，选择要镜像的物理显示屏。";
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
  <NCollapseItem title="屏幕" name="screen">
    <NForm size="small" label-placement="left">
      <MirrorSettingRow label="投屏屏幕" :help="displayIdHelp">
        <MirrorSearchableSelect
          v-model:value="screen.displayId"
          :options="displayOptions"
          :disabled="newDisplayActive"
        />
      </MirrorSettingRow>

      <MirrorSettingRow
        label="新建显示屏"
        help="对应 --new-display：创建独立虚拟屏并镜像其内容；与 display-id 二选一。可选预设或自定义分辨率。"
      >
        <MirrorSearchableSelect
          :value="screen.newDisplaySelect ?? NEW_DISPLAY_OFF"
          :options="newDisplaySelectOptions"
          @update:value="onNewDisplaySelectChange"
        />
      </MirrorSettingRow>

      <template v-if="showNewDisplayDetails">
        <NDivider style="margin: 0.35rem 0">虚拟屏参数</NDivider>

        <MirrorSettingRow label="分辨率" help="虚拟屏宽高（像素）；预设会自动填入。" nested>
          <div class="mirror-settings__resolution">
            <NInputNumber
              v-model:value="screen.newDisplayWidth"
              :min="320"
              :max="7680"
              :step="1"
              style="width: 100%"
            />
            <span>×</span>
            <NInputNumber
              v-model:value="screen.newDisplayHeight"
              :min="320"
              :max="7680"
              :step="1"
              style="width: 100%"
            />
          </div>
        </MirrorSettingRow>

        <MirrorSettingRow label="DPI" help="虚拟屏密度；取消「手动 DPI」时按分辨率自动建议。" nested>
          <NInputNumber
            v-model:value="screen.newDisplayDpi"
            :min="120"
            :max="640"
            :step="1"
            :readonly="!screen.newDisplayDpiManual"
            style="width: 100%"
            @focus="screen.newDisplayDpiManual = true"
          />
        </MirrorSettingRow>

        <MirrorSettingRow
          label="手动设置 DPI"
          help="开启后不再根据分辨率自动调整 DPI。"
          variant="checkbox"
          nested
        >
          <template #control>
            <NSwitch v-model:value="screen.newDisplayDpiManual" />
          </template>
        </MirrorSettingRow>

        <MirrorSettingRow
          label="启动应用"
          help="对应 --start-app：连接后在新建虚拟屏上启动该包名（非主屏）。展开后可在顶部搜索包名。"
          nested
        >
          <MirrorSearchableSelect
            v-model:value="screen.newDisplayApp"
            :options="appSelectOptions"
            placeholder="不指定应用"
            search-placeholder="搜索应用名称或包名"
          />
        </MirrorSettingRow>
      </template>

      <MirrorSettingRow
        label="弹性虚拟屏"
        help="对应 --flex-display：允许虚拟屏随窗口比例调整（需新建显示屏）。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="screen.flexDisplay" :disabled="!newDisplayActive" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="关闭不销毁内容"
        help="对应 --no-vd-destroy-content：关闭虚拟屏时保留其中内容。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="screen.noVdDestroyContent" :disabled="!newDisplayActive" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="无系统装饰"
        help="对应 --no-vd-system-decorations：隐藏虚拟屏系统装饰（标题栏等）。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="screen.noVdSystemDecorations" :disabled="!newDisplayActive" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="IME 策略"
        help="对应 --display-ime-policy；local 为虚拟屏本地输入法（escrcpy 推荐）。"
      >
        <MirrorSearchableSelect
          v-model:value="screen.displayImePolicy"
          :options="imePolicyOptions"
          :disabled="!newDisplayActive"
        />
      </MirrorSettingRow>
    </NForm>
  </NCollapseItem>
</template>
