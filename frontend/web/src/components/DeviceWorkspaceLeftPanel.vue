<script setup>
import { ref } from "vue";

import MirrorCastSettings from "./mirror/MirrorCastSettings.vue";
import { buildCastPayloadFromMirrorSettings } from "../utils/build-cast-payload.js";
import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { DEFAULT_CAST_MODE, DEVICE_CAST_MODES } from "../utils/device-cast-modes.js";

defineProps({
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
const modes = DEVICE_CAST_MODES;

function buildCastOptions() {
  const settings = mirrorSettingsRef.value?.getSettings?.() ?? createDefaultMirrorSettings();
  return buildCastPayloadFromMirrorSettings(settings);
}

function handleStartClick() {
  emit("start-cast", buildCastOptions());
}

function handleStopClick() {
  emit("stop-cast");
}

function handleSettingsChange(settings) {
  if (!props.casting) {
    return;
  }

  emit("cast-options-change", buildCastPayloadFromMirrorSettings(settings));
}
</script>

<template>
  <aside class="workspace-left" aria-label="投屏设置">
    <div class="workspace-left__section workspace-left__top">
      <label class="workspace-left__label" for="cast-mode-select">投屏模式</label>
      <select id="cast-mode-select" v-model="castMode" class="workspace-left__select">
        <option v-for="mode in modes" :key="mode.id" :value="mode.id">
          {{ mode.label }}
        </option>
      </select>
    </div>

    <div class="workspace-left__section workspace-left__middle">
      <MirrorCastSettings
        v-if="castMode === 'mirror'"
        ref="mirrorSettingsRef"
        :serial="device.serial"
        :casting="casting"
        @settings-change="handleSettingsChange"
      />
      <p v-else class="workspace-left__placeholder">该模式的详细设置即将推出。</p>
    </div>

    <div class="workspace-left__section workspace-left__bottom">
      <p v-if="castHint" class="workspace-left__hint workspace-left__hint--error" role="alert">
        {{ castHint }}
      </p>
      <p v-else-if="!device.connected" class="workspace-left__hint">
        设备未在线，无法投屏。
      </p>
      <p v-else class="workspace-left__hint workspace-left__hint--muted">
        网页投屏只需 adb + scrcpy-server，无需双击 scrcpy.exe。
      </p>
      <button
        type="button"
        class="workspace-left__btn workspace-left__btn--ghost"
        :disabled="!casting || castBusy"
        @click="handleStopClick"
      >
        取消投屏
      </button>
      <button
        type="button"
        class="workspace-left__btn workspace-left__btn--primary"
        :disabled="!device.connected || casting || castBusy"
        @click="handleStartClick"
      >
        {{ castBusy ? "正在处理…" : "开始投屏" }}
      </button>
    </div>
  </aside>
</template>
