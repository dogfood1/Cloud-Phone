<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import AppIcon from "./AppIcon.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";
import { getErrorMessage } from "../utils/api.js";
import { logInfo } from "../utils/app-event-logger.js";
import {
  DEVICE_PHOTO_ALBUM_OPTIONS,
  MAX_DEVICE_PHOTO_BYTES,
  MAX_DEVICE_PHOTO_COUNT,
  uploadDevicePhoto,
} from "../utils/device-photo-api.js";

const props = defineProps({
  device: { type: Object, required: true },
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const feedback = useAppFeedback();
const fileInput = ref(null);
const album = ref("pictures");
const entries = ref([]);
const busy = ref(false);
const errorMessage = ref("");
let entrySequence = 0;

const completedCount = computed(() => entries.value.filter((entry) => entry.status === "done").length);
const canUpload = computed(() =>
  props.device?.connected && !busy.value && entries.value.some((entry) => entry.status !== "done"),
);

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function releaseEntries() {
  for (const entry of entries.value) URL.revokeObjectURL(entry.previewUrl);
  entries.value = [];
}

function resetDialog() {
  releaseEntries();
  album.value = "pictures";
  errorMessage.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

watch(
  () => props.open,
  (open) => {
    if (open) resetDialog();
  },
);

onBeforeUnmount(releaseEntries);

function addFiles(fileList) {
  errorMessage.value = "";
  const candidates = Array.from(fileList ?? []);
  const available = Math.max(0, MAX_DEVICE_PHOTO_COUNT - entries.value.length);
  const accepted = [];
  let rejected = 0;

  for (const file of candidates.slice(0, available)) {
    const imageName = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if ((!file.type.startsWith("image/") && !imageName) || file.size <= 0 || file.size > MAX_DEVICE_PHOTO_BYTES) {
      rejected += 1;
      continue;
    }
    accepted.push({
      id: `${Date.now()}-${entrySequence++}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      error: "",
      devicePath: "",
    });
  }

  entries.value.push(...accepted);
  if (candidates.length > available) rejected += candidates.length - available;
  if (rejected) errorMessage.value = `有 ${rejected} 个文件未加入；最多 20 张且单张不超过 50 MB。`;
}

function handleFileInput(event) {
  addFiles(event.target.files);
  event.target.value = "";
}

function handleDrop(event) {
  if (!busy.value) addFiles(event.dataTransfer?.files);
}

function removeEntry(id) {
  if (busy.value) return;
  const index = entries.value.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  URL.revokeObjectURL(entries.value[index].previewUrl);
  entries.value.splice(index, 1);
}

async function uploadAll() {
  if (!canUpload.value) return;
  busy.value = true;
  errorMessage.value = "";
  let uploaded = 0;

  for (const entry of entries.value) {
    if (entry.status === "done") continue;
    entry.status = "uploading";
    entry.error = "";
    try {
      const result = await uploadDevicePhoto(props.device.serial, album.value, entry.file);
      entry.status = "done";
      entry.devicePath = result.devicePath;
      uploaded += 1;
    } catch (error) {
      entry.status = "error";
      entry.error = getErrorMessage(error, "上传失败");
    }
  }

  busy.value = false;
  const failed = entries.value.filter((entry) => entry.status === "error").length;
  if (uploaded) {
    feedback.success(`已上传 ${uploaded} 张照片并刷新相册索引`);
    logInfo("ui", "device.photos.upload", "上传照片到设备相册", {
      deviceSerial: props.device.serial,
      deviceName: props.device.displayName ?? props.device.serial,
      details: { album: album.value, uploaded, failed },
    });
  }
  if (failed) errorMessage.value = `${failed} 张照片上传失败，可直接重试。`;
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
    <div v-if="open" class="device-files-overlay device-photo-overlay" @click="handleBackdropClick">
      <section class="device-photo-dialog" role="dialog" aria-modal="true" aria-label="上传照片" @click.stop>
        <header class="device-files__header">
          <div class="device-files__title">
            <AppIcon name="image-up" />
            <div>
              <h3>上传照片</h3>
              <p>{{ device.displayName }} · {{ device.serial }}</p>
            </div>
          </div>
          <button type="button" class="device-files__close" title="关闭" :disabled="busy" @click="closeDialog">×</button>
        </header>

        <div class="device-photo-dialog__body">
          <label class="device-photo-dialog__album">
            <span>目标相册</span>
            <select v-model="album" :disabled="busy">
              <option v-for="option in DEVICE_PHOTO_ALBUM_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }} · {{ option.path }}
              </option>
            </select>
          </label>

          <label class="device-photo-dialog__dropzone" @dragover.prevent @drop.prevent="handleDrop">
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
              multiple
              :disabled="busy"
              @change="handleFileInput"
            />
            <AppIcon name="image-up" />
            <strong>选择或拖入照片</strong>
            <span>最多 20 张，单张不超过 50 MB</span>
          </label>

          <div v-if="entries.length" class="device-photo-dialog__list">
            <article v-for="entry in entries" :key="entry.id" class="device-photo-dialog__item">
              <img :src="entry.previewUrl" alt="" />
              <div>
                <strong>{{ entry.file.name }}</strong>
                <span>{{ formatBytes(entry.file.size) }}</span>
                <small v-if="entry.status === 'uploading'">正在上传</small>
                <small v-else-if="entry.status === 'done'" class="device-photo-dialog__status--done">已上传并刷新索引</small>
                <small v-else-if="entry.error" class="device-photo-dialog__status--error">{{ entry.error }}</small>
              </div>
              <button type="button" title="移除" :disabled="busy" @click="removeEntry(entry.id)">
                <AppIcon name="trash" />
              </button>
            </article>
          </div>
          <p v-if="errorMessage" class="device-clipboard__error">{{ errorMessage }}</p>
        </div>

        <footer class="device-clipboard__footer">
          <span class="device-photo-dialog__summary">{{ completedCount }} / {{ entries.length }} 已完成</span>
          <div class="device-photo-dialog__actions">
            <button type="button" class="device-clipboard__secondary" :disabled="busy" @click="closeDialog">关闭</button>
            <button type="button" class="device-clipboard__primary" :disabled="!canUpload" @click="uploadAll">
              <AppIcon name="image-up" />
              <span>{{ busy ? "正在上传" : "上传并刷新相册" }}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
