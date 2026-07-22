<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import {
  fetchDeviceQuickSettings,
  patchDeviceQuickSettings,
} from "../../utils/device-quick-settings-api.js";
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

const emit = defineEmits(["status"]);

const loading = ref(false);
const busy = ref(false);
const errorMessage = ref("");
const settings = reactive({
  wifi: { supported: false, enabled: false, connected: false, name: "" },
  bluetooth: { supported: false, enabled: false, connected: false, name: "" },
  airplane: { supported: false, enabled: false },
  volume: { supported: false, level: 0, muted: false },
  brightness: { supported: false, level: 0, auto: false },
});

let pollTimer = null;
let inFlight = false;
let sliderTimer = null;

const volumeIcon = computed(() =>
  settings.volume.muted || settings.volume.level === 0 ? "lucide:volume-x" : "lucide:volume-2",
);

const wifiIcon = computed(() => (settings.wifi.enabled ? "lucide:wifi" : "lucide:wifi-off"));

watch(
  () => [props.active, props.serial],
  ([isActive]) => {
    if (isActive && props.serial) {
      startPolling();
      return;
    }
    stopPolling();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopPolling();
  if (sliderTimer) {
    window.clearTimeout(sliderTimer);
  }
});

function startPolling() {
  stopPolling();
  void refresh({ initial: true });
  pollTimer = window.setInterval(() => {
    void refresh({ initial: false });
  }, 1000);
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function applySettings(next) {
  if (!next) {
    return;
  }

  Object.assign(settings.wifi, next.wifi ?? settings.wifi);
  Object.assign(settings.bluetooth, next.bluetooth ?? settings.bluetooth);
  Object.assign(settings.airplane, next.airplane ?? settings.airplane);
  Object.assign(settings.volume, next.volume ?? settings.volume);
  Object.assign(settings.brightness, next.brightness ?? settings.brightness);
  emit("status", {
    wifiEnabled: settings.wifi.enabled,
    volumeMuted: settings.volume.muted || settings.volume.level === 0,
  });
}

async function refresh({ initial = false } = {}) {
  if (!props.serial || inFlight || busy.value) {
    return;
  }

  inFlight = true;
  if (initial) {
    loading.value = true;
  }

  try {
    applySettings(await fetchDeviceQuickSettings(props.serial));
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = getErrorMessage(error) || "无法读取设备快速设置";
  } finally {
    loading.value = false;
    inFlight = false;
  }
}

async function applyPatch(patch) {
  if (!props.serial || busy.value) {
    return;
  }

  busy.value = true;
  try {
    applySettings(await patchDeviceQuickSettings(props.serial, patch));
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = getErrorMessage(error) || "设置失败";
    await refresh({ initial: false });
  } finally {
    busy.value = false;
  }
}

function toggleWifi() {
  if (!settings.wifi.supported) return;
  void applyPatch({ wifiEnabled: !settings.wifi.enabled });
}

function toggleBluetooth() {
  if (!settings.bluetooth.supported) return;
  void applyPatch({ bluetoothEnabled: !settings.bluetooth.enabled });
}

function toggleAirplane() {
  if (!settings.airplane.supported) return;
  void applyPatch({ airplaneEnabled: !settings.airplane.enabled });
}

function toggleMute() {
  if (!settings.volume.supported) return;
  void applyPatch({ volumeMuted: !settings.volume.muted });
}

function scheduleVolume(level) {
  if (!settings.volume.supported) return;
  settings.volume.level = level;
  settings.volume.muted = level === 0;
  queueSliderPatch({ volumeLevel: level, volumeMuted: level === 0 });
}

function scheduleBrightness(level) {
  if (!settings.brightness.supported) return;
  settings.brightness.level = level;
  queueSliderPatch({ brightnessLevel: level });
}

function queueSliderPatch(patch) {
  if (sliderTimer) {
    window.clearTimeout(sliderTimer);
  }

  sliderTimer = window.setTimeout(() => {
    void applyPatch(patch);
  }, 180);
}

function tileSubtitle(kind) {
  if (kind === "wifi") {
    if (!settings.wifi.supported) return "不支持";
    if (!settings.wifi.enabled) return "已关闭";
    if (settings.wifi.connected && settings.wifi.name) return settings.wifi.name;
    return "未连接";
  }

  if (kind === "bluetooth") {
    if (!settings.bluetooth.supported) return "不支持";
    if (!settings.bluetooth.enabled) return "已关闭";
    if (settings.bluetooth.connected && settings.bluetooth.name) {
      return settings.bluetooth.name;
    }
    return "未连接设备";
  }

  if (!settings.airplane.supported) return "不支持";
  return settings.airplane.enabled ? "已开启" : "已关闭";
}
</script>

<template>
  <div class="win11-quick-settings">
    <p v-if="loading" class="win11-quick-settings__status">正在同步设备状态…</p>
    <p v-else-if="errorMessage" class="win11-quick-settings__status is-error">{{ errorMessage }}</p>

    <div class="win11-quick-settings__tiles">
      <button
        type="button"
        class="win11-quick-settings__tile"
        :class="{
          'is-on': settings.wifi.enabled,
          'is-disabled': !settings.wifi.supported,
        }"
        :disabled="!settings.wifi.supported || busy"
        @click="toggleWifi"
      >
        <Icon :icon="wifiIcon" :width="18" :height="18" />
        <span>Wi-Fi</span>
        <small :title="tileSubtitle('wifi')">{{ tileSubtitle("wifi") }}</small>
      </button>

      <button
        type="button"
        class="win11-quick-settings__tile"
        :class="{
          'is-on': settings.bluetooth.enabled,
          'is-disabled': !settings.bluetooth.supported,
        }"
        :disabled="!settings.bluetooth.supported || busy"
        @click="toggleBluetooth"
      >
        <Icon icon="lucide:bluetooth" :width="18" :height="18" />
        <span>蓝牙</span>
        <small :title="tileSubtitle('bluetooth')">{{ tileSubtitle("bluetooth") }}</small>
      </button>

      <button
        type="button"
        class="win11-quick-settings__tile"
        :class="{
          'is-on': settings.airplane.enabled,
          'is-disabled': !settings.airplane.supported,
        }"
        :disabled="!settings.airplane.supported || busy"
        @click="toggleAirplane"
      >
        <Icon icon="lucide:plane" :width="18" :height="18" />
        <span>飞行模式</span>
        <small>{{ tileSubtitle("airplane") }}</small>
      </button>
    </div>

    <div class="win11-quick-settings__sliders">
      <div
        class="win11-quick-settings__slider-row"
        :class="{ 'is-disabled': !settings.volume.supported }"
      >
        <button
          type="button"
          class="win11-quick-settings__slider-icon"
          :disabled="!settings.volume.supported || busy"
          @click="toggleMute"
        >
          <Icon :icon="volumeIcon" :width="16" :height="16" />
        </button>
        <input
          class="win11-quick-settings__range"
          type="range"
          min="0"
          max="100"
          :value="settings.volume.level"
          :disabled="!settings.volume.supported || busy"
          :style="{ '--pct': `${settings.volume.level}%` }"
          @input="scheduleVolume(Number($event.target.value))"
        />
        <span class="win11-quick-settings__slider-value">{{ settings.volume.level }}</span>
      </div>

      <div
        class="win11-quick-settings__slider-row"
        :class="{ 'is-disabled': !settings.brightness.supported }"
      >
        <span class="win11-quick-settings__slider-icon">
          <Icon icon="lucide:sun" :width="16" :height="16" />
        </span>
        <input
          class="win11-quick-settings__range"
          type="range"
          min="0"
          max="100"
          :value="settings.brightness.level"
          :disabled="!settings.brightness.supported || busy"
          :style="{ '--pct': `${settings.brightness.level}%` }"
          @input="scheduleBrightness(Number($event.target.value))"
        />
        <span class="win11-quick-settings__slider-value">{{ settings.brightness.level }}</span>
      </div>
    </div>
  </div>
</template>
