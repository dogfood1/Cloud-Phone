<script setup>
import { computed, ref } from "vue";

import Win11TaskbarIcon from "./Win11TaskbarIcon.vue";

const wifiEnabled = ref(true);
const bluetoothEnabled = ref(true);
const airplaneMode = ref(false);
const focusAssist = ref(false);
const nightLight = ref(false);
const volumeLevel = ref(68);
const brightnessLevel = ref(72);
const muted = ref(false);

const volumeIcon = computed(() => (muted.value || volumeLevel.value === 0 ? "volume-mute" : "volume"));
</script>

<template>
  <div class="win11-quick-settings">
    <div class="win11-quick-settings__tiles">
      <button type="button" class="win11-quick-settings__tile" :class="{ 'is-on': wifiEnabled }">
        <Win11TaskbarIcon :name="wifiEnabled ? 'wifi' : 'wifi-off'" :size="18" />
        <span>Wi-Fi</span>
        <small>Cloud Phone Wi-Fi</small>
      </button>
      <button type="button" class="win11-quick-settings__tile" :class="{ 'is-on': bluetoothEnabled }">
        <Win11TaskbarIcon name="bluetooth" :size="18" />
        <span>蓝牙</span>
      </button>
      <button type="button" class="win11-quick-settings__tile" :class="{ 'is-on': airplaneMode }">
        <span class="win11-quick-settings__glyph">✈</span>
        <span>飞行模式</span>
      </button>
      <button type="button" class="win11-quick-settings__tile">
        <span class="win11-quick-settings__glyph">🔋</span>
        <span>节能模式</span>
      </button>
      <button type="button" class="win11-quick-settings__tile" :class="{ 'is-on': focusAssist }">
        <span class="win11-quick-settings__glyph">🌙</span>
        <span>专注助手</span>
      </button>
      <button type="button" class="win11-quick-settings__tile" :class="{ 'is-on': nightLight }">
        <Win11TaskbarIcon name="brightness" :size="18" />
        <span>夜间模式</span>
      </button>
    </div>

    <div class="win11-quick-settings__sliders">
      <div class="win11-quick-settings__slider-row">
        <button type="button" class="win11-quick-settings__slider-icon" @click="muted = !muted">
          <Win11TaskbarIcon :name="volumeIcon" :size="16" />
        </button>
        <input
          v-model.number="volumeLevel"
          class="win11-quick-settings__range"
          type="range"
          min="0"
          max="100"
          :style="{ '--pct': `${muted ? 0 : volumeLevel}%` }"
        />
      </div>
      <div class="win11-quick-settings__slider-row">
        <span class="win11-quick-settings__slider-icon">
          <Win11TaskbarIcon name="brightness" :size="16" />
        </span>
        <input
          v-model.number="brightnessLevel"
          class="win11-quick-settings__range"
          type="range"
          min="0"
          max="100"
          :style="{ '--pct': `${brightnessLevel}%` }"
        />
      </div>
    </div>

    <button type="button" class="win11-quick-settings__footer">
      <Win11TaskbarIcon name="settings-gear" :size="16" />
      <span>所有设置</span>
    </button>
  </div>
</template>
