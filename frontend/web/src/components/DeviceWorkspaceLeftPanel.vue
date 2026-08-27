<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { NButton, NForm, NFormItem, NSpace, NText } from "naive-ui";

import AppIcon from "./AppIcon.vue";
import CameraCastSettings from "./mirror/CameraCastSettings.vue";
import HarmonyCastSettings from "./mirror/HarmonyCastSettings.vue";
import MirrorCastSettings from "./mirror/MirrorCastSettings.vue";
import MirrorSearchableSelect from "./mirror/MirrorSearchableSelect.vue";
import HelpHint from "./ui/HelpHint.vue";
import PanelAlert from "./ui/PanelAlert.vue";
import {
  buildCastPayloadFromCameraSettings,
  buildCastPayloadFromMirrorSettings,
} from "../utils/build-cast-payload.js";
import { buildHarmonyCastOptions } from "../utils/harmony-cast-options.js";
import { createDefaultCameraSettings } from "../utils/camera-cast-defaults.js";
import { createDefaultMirrorSettings } from "../utils/mirror-cast-defaults.js";
import { DEFAULT_CAST_MODE, DEVICE_CAST_MODES } from "../utils/device-cast-modes.js";
import { getErrorMessage } from "../utils/api.js";
import { logDebug, logInfo, logWarn } from "../utils/app-event-logger.js";
import { fetchRedroidStatus, updateRedroidCameraImage } from "../utils/redroid-api.js";
import { formatAndroidVersion } from "../utils/device-format.js";

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
});

const emit = defineEmits(["start-cast", "stop-cast", "cast-options-change", "camera-control"]);

const castMode = defineModel("castMode", { default: DEFAULT_CAST_MODE });

const mirrorSettingsRef = ref(null);
const cameraSettingsRef = ref(null);
const harmonySettingsRef = ref(null);
const redroidStatus = ref(null);
const redroidLoading = ref(false);
const fixedCameraBusy = ref(false);
const fixedCameraFile = ref(null);
const fixedCameraPreview = ref("");
const fixedCameraError = ref("");
const fixedCameraFeedback = ref("");
const fixedCameraFitMode = ref("cover");
const fixedCameraMirror = ref(false);

const CAMERA_IMAGE_FIT_OPTIONS = [
  { label: "填满裁剪", value: "cover" },
  { label: "完整显示", value: "contain" },
  { label: "拉伸填满", value: "stretch" },
];

const isHarmonyDevice = computed(() => props.device?.platform === "harmony");
const isIosDevice = computed(() => props.device?.platform === "ios");
const isJpegCastDevice = computed(() => isHarmonyDevice.value || isIosDevice.value);
const androidLine = computed(() => formatAndroidVersion(props.device));

const canStartCast = computed(() => {
  if (props.casting || props.castBusy) {
    return false;
  }

  return Boolean(props.device?.connected && props.device?.serial);
});

const startButtonLabel = computed(() => (props.castBusy ? "正在处理…" : "开始投屏"));

const castHelpText = computed(() => {
  if (!props.device.connected) {
    return "设备未在线，无法投屏。";
  }

  if (isHarmonyDevice.value) {
    return "请确认设备已通过 HDC 在线。";
  }

  if (isIosDevice.value) {
    return "通过 Mac 上的 WebDriverAgent 推送 MJPEG 画面；支持触控与主屏幕/电源/音量键。";
  }

  return "网页投屏只需 adb + scrcpy-server，无需双击 scrcpy.exe。";
});

const modeOptions = computed(() =>
  DEVICE_CAST_MODES.map((mode) => ({ label: mode.label, value: mode.id })),
);

function adbPortFromSerial(serial) {
  const value = String(serial ?? "");
  const tcpMatch = value.match(/:(\d{1,5})$/);
  if (tcpMatch) {
    return Number(tcpMatch[1]);
  }

  const emulatorMatch = value.match(/^emulator-(\d{1,5})$/);
  if (emulatorMatch) {
    return Number(emulatorMatch[1]) + 1;
  }

  return null;
}

const redroidInstance = computed(() => {
  const instances = redroidStatus.value?.instances ?? [];
  const adbPort = adbPortFromSerial(props.device?.serial);

  if (adbPort) {
    const byPort = instances.find((instance) => Number(instance.adbPort) === adbPort);
    if (byPort) {
      return byPort;
    }
  }

  if (props.device?.serial === "emulator-5554" && instances.length === 1) {
    return instances[0];
  }

  return null;
});

const fixedCameraVideoNr = computed(() => {
  const instanceVideoNr = redroidInstance.value?.videoNr;
  if (instanceVideoNr != null) {
    return Number(instanceVideoNr);
  }

  return Number(redroidStatus.value?.config?.defaultVideoNr ?? 20);
});

const fixedCameraSize = computed(() => ({
  width: Number(redroidStatus.value?.config?.cameraWidth ?? 1280),
  height: Number(redroidStatus.value?.config?.cameraHeight ?? 720),
}));

const showFixedCamera = computed(() =>
  props.device?.platform === "android" && Boolean(redroidInstance.value),
);

const fixedCameraMeta = computed(() => {
  if (!showFixedCamera.value) {
    return "";
  }

  const { width, height } = fixedCameraSize.value;
  const fps = Number(redroidStatus.value?.config?.cameraFps ?? 30);
  return `${redroidInstance.value?.name ?? "ReDroid"} · /dev/video${fixedCameraVideoNr.value} · ${width}x${height}@${fps}`;
});

function previewObjectFit(mode) {
  if (mode === "contain") {
    return "contain";
  }
  if (mode === "stretch") {
    return "fill";
  }
  return "cover";
}

watch(castMode, (nextMode, previousMode) => {
  if (previousMode && nextMode !== previousMode && !props.casting) {
    logInfo("cast", "cast.mode.change", `切换投屏模式：${previousMode} → ${nextMode}`, {
      deviceSerial: props.device.serial,
      deviceName: props.device.displayName ?? props.device.serial,
      details: { from: previousMode, to: nextMode },
    });
  }
});

watch(
  () => props.device?.serial,
  () => {
    fixedCameraError.value = "";
    fixedCameraFeedback.value = "";
    fixedCameraFile.value = null;
    fixedCameraPreview.value = "";
    void loadRedroidStatus();
  },
);

function buildCastOptions() {
  if (isJpegCastDevice.value) {
    if (isHarmonyDevice.value) {
      return harmonySettingsRef.value?.getSettings?.() ?? buildHarmonyCastOptions(props.device);
    }

    return {};
  }

  if (castMode.value === "camera") {
    const settings = cameraSettingsRef.value?.getSettings?.() ?? createDefaultCameraSettings();
    return buildCastPayloadFromCameraSettings(settings, props.device.sdkVersion);
  }

  const settings = mirrorSettingsRef.value?.getSettings?.() ?? createDefaultMirrorSettings();
  return buildCastPayloadFromMirrorSettings(settings, props.device.sdkVersion);
}

function handleStartClick() {
  const options = buildCastOptions();
  logInfo("cast", "cast.start.click", "点击开始投屏按钮", {
    deviceSerial: props.device.serial,
    deviceName: props.device.displayName ?? props.device.serial,
    details: { options },
  });
  emit("start-cast", options);
}

function handleStopClick() {
  logInfo("cast", "cast.stop.click", "点击取消投屏按钮", {
    deviceSerial: props.device.serial,
    deviceName: props.device.displayName ?? props.device.serial,
  });
  emit("stop-cast");
}

function handleSettingsChange(settings) {
  if (props.casting) {
    return;
  }

  const options = buildCastOptions();
  logDebug("cast", "cast.settings.change", "修改投屏参数", {
    deviceSerial: props.device.serial,
    deviceName: props.device.displayName ?? props.device.serial,
    details: {
      castMode: castMode.value,
      settings,
      options,
    },
  });
  emit("cast-options-change", options);
}

async function loadRedroidStatus() {
  if (props.device?.platform !== "android") {
    redroidStatus.value = null;
    return;
  }

  redroidLoading.value = true;
  try {
    redroidStatus.value = await fetchRedroidStatus();
  } catch (error) {
    fixedCameraError.value = getErrorMessage(error, "加载 ReDroid 摄像头状态失败。");
    logWarn("redroid", "redroid.device.status_failed", fixedCameraError.value, {
      deviceSerial: props.device.serial,
      deviceName: props.device.displayName ?? props.device.serial,
    });
  } finally {
    redroidLoading.value = false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败。"));
    reader.readAsDataURL(file);
  });
}

function handleFixedCameraSelected(event) {
  const file = event.target.files?.[0] ?? null;
  fixedCameraFile.value = file;
  fixedCameraPreview.value = "";
  fixedCameraError.value = "";
  fixedCameraFeedback.value = "";

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    fixedCameraPreview.value = String(reader.result ?? "");
  };
  reader.readAsDataURL(file);
}

async function applyFixedCameraImage() {
  if (!fixedCameraFile.value) {
    fixedCameraError.value = "请选择图片。";
    return;
  }

  fixedCameraBusy.value = true;
  fixedCameraError.value = "";
  fixedCameraFeedback.value = "";

  try {
    const imageDataUrl = await readFileAsDataUrl(fixedCameraFile.value);
    const { width, height } = fixedCameraSize.value;
    const result = await updateRedroidCameraImage({
      imageDataUrl,
      filename: fixedCameraFile.value.name,
      videoNr: fixedCameraVideoNr.value,
      width,
      height,
      fitMode: fixedCameraFitMode.value,
      mirror: fixedCameraMirror.value,
    });
    redroidStatus.value = {
      ...(redroidStatus.value ?? {}),
      camera: result.camera,
    };
    fixedCameraFeedback.value = `已应用到 /dev/video${fixedCameraVideoNr.value}`;
    logInfo("redroid", "redroid.device.camera.update", "在设备详情中更新固定摄像头图片", {
      deviceSerial: props.device.serial,
      deviceName: props.device.displayName ?? props.device.serial,
      details: {
        videoNr: fixedCameraVideoNr.value,
        filename: fixedCameraFile.value.name,
        fitMode: fixedCameraFitMode.value,
        mirror: fixedCameraMirror.value,
        managedWriter: Boolean(result.managedWriter),
      },
    });
  } catch (error) {
    fixedCameraError.value = getErrorMessage(error, "设置摄像头图片失败。");
  } finally {
    fixedCameraBusy.value = false;
  }
}

function stepPreviewRotationDeg() {
  return mirrorSettingsRef.value?.stepPreviewRotationDeg?.();
}

onMounted(() => {
  void loadRedroidStatus();
});

defineExpose({ stepPreviewRotationDeg });
</script>

<template>
  <aside class="workspace-left" aria-label="投屏设置">
    <div class="workspace-left__section workspace-left__top">
      <div class="workspace-left__top-row">
        <NForm v-if="!isJpegCastDevice" size="small" :show-feedback="false" style="flex: 1">
          <NFormItem label="投屏模式" label-placement="top">
            <MirrorSearchableSelect
              v-model:value="castMode"
              :options="modeOptions"
              :disabled="casting || castBusy"
            />
          </NFormItem>
        </NForm>
        <NText v-else depth="2" style="font-weight: 600">
          {{ isIosDevice ? "iOS MJPEG 投屏" : "鸿蒙 JPEG 投屏" }}
        </NText>
        <HelpHint :content="castHelpText" title="投屏说明" size="sm" />
      </div>

      <dl class="workspace-device-info">
        <div>
          <dt>网络 IP</dt>
          <dd>{{ device.ipAddress || "—" }}</dd>
        </div>
        <div>
          <dt>系统</dt>
          <dd>{{ androidLine || "—" }}</dd>
        </div>
        <div>
          <dt>序列号</dt>
          <dd>{{ device.serial }}</dd>
        </div>
      </dl>
    </div>

    <div class="workspace-left__section workspace-left__middle">
      <HarmonyCastSettings
        v-if="isHarmonyDevice"
        ref="harmonySettingsRef"
        :device="device"
        :casting="casting"
        @settings-change="handleSettingsChange"
      />
      <div v-else-if="isIosDevice" class="workspace-left__placeholder">
        iOS 设备通过 WDA 推送 MJPEG 画面。
      </div>
      <MirrorCastSettings
        v-else-if="castMode === 'mirror'"
        ref="mirrorSettingsRef"
        :serial="device.serial"
        :device-sdk="device.sdkVersion"
        :casting="casting"
        @settings-change="handleSettingsChange"
      />
      <CameraCastSettings
        v-else-if="castMode === 'camera'"
        ref="cameraSettingsRef"
        :serial="device.serial"
        :device-sdk="device.sdkVersion"
        :casting="casting"
        @settings-change="handleSettingsChange"
        @camera-control="(payload) => emit('camera-control', payload)"
      />
      <div v-else-if="castMode === 'multiApp'" class="workspace-left__placeholder">
        多应用投屏将在右侧全屏桌面中打开，左侧设置栏会自动隐藏。
      </div>
      <p v-else class="workspace-left__placeholder">该模式的详细设置即将推出。</p>
    </div>

    <div v-if="showFixedCamera" class="workspace-left__section workspace-fixed-camera">
      <div class="workspace-fixed-camera__head">
        <strong>固定摄像头图片</strong>
        <span>{{ fixedCameraMeta }}</span>
      </div>

      <label class="workspace-fixed-camera__dropzone">
        <input accept="image/*" type="file" :disabled="fixedCameraBusy" @change="handleFixedCameraSelected" />
        <img
          v-if="fixedCameraPreview"
          :src="fixedCameraPreview"
          :class="{ 'workspace-fixed-camera__preview--mirror': fixedCameraMirror }"
          :style="{ objectFit: previewObjectFit(fixedCameraFitMode) }"
          alt=""
        />
        <span v-else>选择图片</span>
      </label>

      <div class="workspace-fixed-camera__options">
        <label>
          <span>适配</span>
          <select v-model="fixedCameraFitMode" :disabled="fixedCameraBusy">
            <option
              v-for="option in CAMERA_IMAGE_FIT_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="workspace-fixed-camera__check">
          <input v-model="fixedCameraMirror" type="checkbox" :disabled="fixedCameraBusy" />
          <span>手动镜像输入</span>
        </label>
      </div>

      <NButton
        block
        type="primary"
        :loading="fixedCameraBusy"
        :disabled="fixedCameraBusy || redroidLoading || !fixedCameraFile"
        @click="applyFixedCameraImage"
      >
        <template #icon>
          <AppIcon name="image" />
        </template>
        应用固定图片
      </NButton>

      <p v-if="fixedCameraFeedback" class="workspace-left__hint">{{ fixedCameraFeedback }}</p>
      <p v-if="fixedCameraError" class="workspace-left__hint workspace-left__hint--error">{{ fixedCameraError }}</p>
    </div>

    <div class="workspace-left__section workspace-left__bottom">
      <NSpace vertical :size="10">
        <PanelAlert
          v-if="!device.connected"
          type="warning"
          :message="'设备未在线，无法投屏。'"
        />

        <NButton block :disabled="!casting || castBusy" @click="handleStopClick">
          取消投屏
        </NButton>
        <NButton
          block
          type="primary"
          :disabled="!canStartCast || casting || castBusy"
          :loading="castBusy"
          @click="handleStartClick"
        >
          {{ startButtonLabel }}
        </NButton>
      </NSpace>
    </div>
  </aside>
</template>
