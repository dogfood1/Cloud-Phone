<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import AppIcon from "./AppIcon.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";
import { getErrorMessage } from "../utils/api.js";
import { logInfo } from "../utils/app-event-logger.js";
import { updateRedroidCameraImage } from "../utils/redroid-api.js";

const props = defineProps({
  device: { type: Object, required: true },
  open: { type: Boolean, default: false },
  videoNr: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  meta: { type: String, default: "" },
});

const emit = defineEmits(["close", "applied"]);
const feedback = useAppFeedback();
const busy = ref(false);
const file = ref(null);
const previewUrl = ref("");
const errorMessage = ref("");
const fitMode = ref("cover");
const mirror = ref(false);

const fitOptions = [
  { label: "填满裁剪", value: "cover" },
  { label: "完整显示", value: "contain" },
  { label: "拉伸填满", value: "stretch" },
];

const previewObjectFit = computed(() => {
  if (fitMode.value === "contain") return "contain";
  if (fitMode.value === "stretch") return "fill";
  return "cover";
});

function releasePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
}

function resetForm() {
  releasePreview();
  file.value = null;
  errorMessage.value = "";
  fitMode.value = "cover";
  mirror.value = false;
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm();
  },
);

onBeforeUnmount(releasePreview);

function handleFileSelected(event) {
  const selected = event.target.files?.[0] ?? null;
  releasePreview();
  file.value = selected;
  errorMessage.value = "";
  if (selected) previewUrl.value = URL.createObjectURL(selected);
}

function readFileAsDataUrl(selected) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败。"));
    reader.readAsDataURL(selected);
  });
}

async function applyImage() {
  if (!file.value || busy.value) {
    errorMessage.value = "请选择图片。";
    return;
  }

  busy.value = true;
  errorMessage.value = "";
  try {
    const result = await updateRedroidCameraImage({
      imageDataUrl: await readFileAsDataUrl(file.value),
      filename: file.value.name,
      videoNr: props.videoNr,
      width: props.width,
      height: props.height,
      fitMode: fitMode.value,
      mirror: mirror.value,
    });
    logInfo("redroid", "redroid.device.camera.update", "在设备详情中更新固定摄像头图片", {
      deviceSerial: props.device.serial,
      deviceName: props.device.displayName ?? props.device.serial,
      details: {
        videoNr: props.videoNr,
        filename: file.value.name,
        fitMode: fitMode.value,
        mirror: mirror.value,
        managedWriter: Boolean(result.managedWriter),
      },
    });
    emit("applied", result.camera);
    feedback.success(`已应用到 /dev/video${props.videoNr}`);
    emit("close");
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "设置摄像头图片失败。");
  } finally {
    busy.value = false;
  }
}

function closeDialog() {
  if (!busy.value) emit("close");
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) closeDialog();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="device-files-overlay device-camera-overlay"
      @click="handleBackdropClick"
    >
      <section class="device-camera-dialog" role="dialog" aria-modal="true" aria-label="设置固定摄像头图片" @click.stop>
        <header class="device-files__header">
          <div class="device-files__title">
            <AppIcon name="camera" />
            <div>
              <h3>设置摄像头图片</h3>
              <p>{{ meta }}</p>
            </div>
          </div>
          <button type="button" class="device-files__close" title="关闭" :disabled="busy" @click="closeDialog">×</button>
        </header>

        <div class="device-camera-dialog__body">
          <label class="device-camera-dialog__dropzone">
            <input accept="image/*" type="file" :disabled="busy" @change="handleFileSelected" />
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :class="{ 'device-camera-dialog__preview--mirror': mirror }"
              :style="{ objectFit: previewObjectFit }"
              alt="待应用的摄像头图片"
            />
            <span v-else><AppIcon name="image-up" />选择图片</span>
          </label>

          <div class="device-camera-dialog__options">
            <label>
              <span>画面适配</span>
              <select v-model="fitMode" :disabled="busy">
                <option v-for="option in fitOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label class="device-camera-dialog__check">
              <input v-model="mirror" type="checkbox" :disabled="busy" />
              <span>手动镜像输入</span>
            </label>
          </div>
          <p v-if="errorMessage" class="device-clipboard__error">{{ errorMessage }}</p>
        </div>

        <footer class="device-clipboard__footer">
          <button type="button" class="device-clipboard__secondary" :disabled="busy" @click="closeDialog">取消</button>
          <button type="button" class="device-clipboard__primary" :disabled="busy || !file" @click="applyImage">
            <AppIcon name="image" />
            <span>{{ busy ? "正在应用" : "应用固定图片" }}</span>
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
