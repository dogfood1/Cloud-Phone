<script setup>
import { computed, ref } from "vue";
import { NAlert, NButton, NForm, NFormItem, NSpace, NText } from "naive-ui";

import MirrorCastSettings from "./mirror/MirrorCastSettings.vue";
import MirrorSearchableSelect from "./mirror/MirrorSearchableSelect.vue";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { DEFAULT_CAST_MODE, DEVICE_CAST_MODES } from "../utils/device-cast-modes.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  casting: {
    type: Boolean,
    required: true,
  },
  castBusy: {
    type: Boolean,
    default: false,
  },
  castHint: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["start-cast", "stop-cast", "cast-options-change"]);

const mirrorSettingsRef = ref(null);
const castMode = ref(DEFAULT_CAST_MODE);

const modeOptions = computed(() =>
  DEVICE_CAST_MODES.map((mode) => ({ label: mode.label, value: mode.id })),
);

function buildCastOptions() {
  const settings = mirrorSettingsRef.value?.getSettings?.() ?? createDefaultMirrorSettings();
  return buildCastPayloadFromMirrorSettings(settings, props.device.sdkVersion);
}

function handleStartClick() {
  emit("start-cast", buildCastOptions());
}

function handleStopClick() {
  emit("stop-cast");
}

function handleSettingsChange() {
  // Settings are locked while casting; options apply on next start.
}

function stepPreviewRotationDeg() {
  return mirrorSettingsRef.value?.stepPreviewRotationDeg?.();
}

defineExpose({ stepPreviewRotationDeg });
</script>

<template>
  <aside class="workspace-left" aria-label="投屏设置">
    <div class="workspace-left__section workspace-left__top">
      <NForm size="small" :show-feedback="false">
        <NFormItem label="投屏模式" label-placement="top">
          <MirrorSearchableSelect
            v-model:value="castMode"
            :options="modeOptions"
            :disabled="casting || castBusy"
          />
        </NFormItem>
      </NForm>
    </div>

    <div class="workspace-left__section workspace-left__middle">
      <MirrorCastSettings
        v-if="castMode === 'mirror'"
        ref="mirrorSettingsRef"
        :serial="device.serial"
        :device-sdk="device.sdkVersion"
        :casting="casting"
        @settings-change="handleSettingsChange"
      />
      <p v-else class="workspace-left__placeholder">该模式的详细设置即将推出。</p>
    </div>

    <div class="workspace-left__section workspace-left__bottom">
      <NSpace vertical :size="10">
        <NAlert v-if="castHint" type="error" :bordered="false">
          {{ castHint }}
        </NAlert>
        <NAlert v-else-if="!device.connected" type="warning" :bordered="false">
          设备未在线，无法投屏。
        </NAlert>
        <NText v-else depth="3" style="font-size: 0.8rem">
          网页投屏只需 adb + scrcpy-server，无需双击 scrcpy.exe。
        </NText>

        <NButton block :disabled="!casting || castBusy" @click="handleStopClick">
          取消投屏
        </NButton>
        <NButton
          block
          type="primary"
          :disabled="!device.connected || casting || castBusy"
          :loading="castBusy"
          @click="handleStartClick"
        >
          {{ castBusy ? "正在处理…" : "开始投屏" }}
        </NButton>
      </NSpace>
    </div>
  </aside>
</template>
