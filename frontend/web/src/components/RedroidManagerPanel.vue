<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import PageHeader from "./ui/PageHeader.vue";
import PanelAlert from "./ui/PanelAlert.vue";
import {
  createRedroidInstance,
  deleteRedroidInstance,
  fetchRedroidModels,
  fetchRedroidStatus,
  startRedroidInstance,
  stopRedroidInstance,
  updateRedroidCameraImage,
} from "../utils/redroid-api.js";
import { getErrorMessage } from "../utils/api.js";
import { logInfo } from "../utils/app-event-logger.js";

const emit = defineEmits(["refresh-devices"]);

const loading = ref(false);
const actionLoading = ref(false);
const error = ref("");
const feedback = ref("");
const status = ref(null);
const models = ref([]);
const modelsMeta = ref(null);
const modelQuery = ref("Pixel");
const selectedImage = ref(null);
const selectedImagePreview = ref("");

const createForm = reactive({
  name: "test02",
  image: "redroid:13.0.0_arm64_only_extcam_rgba",
  adbPort: 5556,
  videoNr: 20,
  width: 720,
  height: 1280,
  dpi: 320,
  fps: 30,
  model: {
    brand: "Google",
    manufacturer: "Google",
    modelCode: "G-2PW4100",
    marketingName: "Pixel",
    device: "sailfish",
    productName: "sailfish",
  },
});

const cameraStatusLabel = computed(() => {
  const camera = status.value?.camera;
  if (!camera) {
    return "未加载";
  }
  return camera.serviceActive ? "相机服务运行中" : "相机服务未运行";
});

const instances = computed(() => status.value?.instances ?? []);
const config = computed(() => status.value?.config ?? {});

function applyStatusDefaults(payload) {
  if (payload?.config?.image) {
    createForm.image = payload.config.image;
  }

  if (payload?.nextAdbPort) {
    createForm.adbPort = payload.nextAdbPort;
  }

  if (payload?.config?.defaultVideoNr != null) {
    createForm.videoNr = payload.config.defaultVideoNr;
  }
}

async function loadStatus() {
  loading.value = true;
  error.value = "";
  try {
    const payload = await fetchRedroidStatus();
    status.value = payload;
    applyStatusDefaults(payload);
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "加载 ReDroid 状态失败。");
  } finally {
    loading.value = false;
  }
}

async function loadModels(options = {}) {
  try {
    const payload = await fetchRedroidModels({
      query: modelQuery.value,
      limit: 80,
      refresh: options.refresh,
    });
    models.value = payload.models ?? [];
    modelsMeta.value = payload;
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "加载机型列表失败。");
  }
}

function applyModel(model) {
  createForm.model.brand = model.brand || model.manufacturer || "Google";
  createForm.model.manufacturer = model.manufacturer || model.brand || "Google";
  createForm.model.modelCode = model.modelCode || model.model || "";
  createForm.model.marketingName = model.marketingName || "";
  createForm.model.device = model.device || model.codename || "";
  createForm.model.productName = model.productName || model.device || model.codename || "";
  feedback.value = `已选择 ${model.label || model.modelCode}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败。"));
    reader.readAsDataURL(file);
  });
}

function handleImageSelected(event) {
  const file = event.target.files?.[0] ?? null;
  selectedImage.value = file;
  selectedImagePreview.value = "";

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedImagePreview.value = String(reader.result ?? "");
  };
  reader.readAsDataURL(file);
}

async function handleUpdateCameraImage() {
  if (!selectedImage.value) {
    error.value = "请选择一张图片。";
    return;
  }

  actionLoading.value = true;
  error.value = "";
  feedback.value = "";

  try {
    const imageDataUrl = await readFileAsDataUrl(selectedImage.value);
    const result = await updateRedroidCameraImage({
      imageDataUrl,
      filename: selectedImage.value.name,
      videoNr: Number(config.value.defaultVideoNr ?? 20),
      width: Number(config.value.cameraWidth ?? 1280),
      height: Number(config.value.cameraHeight ?? 720),
    });
    status.value = {
      ...(status.value ?? {}),
      camera: result.camera,
    };
    feedback.value = result.managedWriter
      ? "图片已保存，并由 Cloud-Phone 托管 ffmpeg 写入。"
      : "图片已保存，宿主机相机服务已重启。";
    logInfo("redroid", "redroid.camera.update", "更新虚拟摄像头图片", {
      details: {
        videoNr: config.value.defaultVideoNr ?? 20,
        filename: selectedImage.value.name,
      },
    });
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "更新摄像头图片失败。");
  } finally {
    actionLoading.value = false;
  }
}

async function handleCreateInstance() {
  actionLoading.value = true;
  error.value = "";
  feedback.value = "";

  try {
    await createRedroidInstance({
      name: createForm.name,
      image: createForm.image,
      adbPort: Number(createForm.adbPort),
      videoNr: Number(createForm.videoNr),
      width: Number(createForm.width),
      height: Number(createForm.height),
      dpi: Number(createForm.dpi),
      fps: Number(createForm.fps),
      model: { ...createForm.model },
    });
    feedback.value = `已创建 ${createForm.name}。`;
    logInfo("redroid", "redroid.instance.create", `创建云手机：${createForm.name}`, {
      details: {
        adbPort: createForm.adbPort,
        videoNr: createForm.videoNr,
        model: createForm.model,
      },
    });
    await loadStatus();
    emit("refresh-devices");
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "创建 ReDroid 容器失败。");
  } finally {
    actionLoading.value = false;
  }
}

async function runInstanceAction(instance, action) {
  actionLoading.value = true;
  error.value = "";
  feedback.value = "";

  try {
    if (action === "start") {
      await startRedroidInstance(instance.name);
      feedback.value = `已启动 ${instance.name}。`;
    } else if (action === "stop") {
      await stopRedroidInstance(instance.name);
      feedback.value = `已停止 ${instance.name}。`;
    } else if (action === "delete") {
      const confirmed = window.confirm(`删除 ${instance.name} 的容器？`);
      if (!confirmed) {
        return;
      }
      const removeData = window.confirm(`同时删除 ${instance.name} 的数据目录？`);
      await deleteRedroidInstance(instance.name, { removeData });
      feedback.value = `已删除 ${instance.name}。`;
    }

    await loadStatus();
    emit("refresh-devices");
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "容器操作失败。");
  } finally {
    actionLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadModels()]);
});
</script>

<template>
  <section class="redroid-view">
    <PageHeader
      eyebrow="ReDroid"
      title="云手机"
      :meta="cameraStatusLabel"
    >
      <template #actions>
        <button type="button" class="panel-header__add-device" title="刷新" @click="loadStatus">
          <AppIcon name="refresh" />
        </button>
      </template>
    </PageHeader>

    <PanelAlert v-if="error" type="error" :message="error" />
    <PanelAlert v-if="feedback" type="info" :message="feedback" />

    <div class="redroid-layout">
      <section class="redroid-panel">
        <div class="redroid-panel__header">
          <div>
            <h3>摄像头图片</h3>
            <p>/dev/video{{ config.defaultVideoNr ?? 20 }} · {{ config.cameraWidth ?? 1280 }}x{{ config.cameraHeight ?? 720 }}@{{ config.cameraFps ?? 30 }}</p>
          </div>
          <span class="status-pill">{{ cameraStatusLabel }}</span>
        </div>

        <label class="redroid-dropzone">
          <input accept="image/*" type="file" @change="handleImageSelected" />
          <img v-if="selectedImagePreview" :src="selectedImagePreview" alt="" />
          <span v-else>选择图片作为虚拟摄像头画面</span>
        </label>

        <button
          type="button"
          class="redroid-primary"
          :disabled="actionLoading || !selectedImage"
          @click="handleUpdateCameraImage"
        >
          <AppIcon name="image" />
          <span>应用图片</span>
        </button>
      </section>

      <section class="redroid-panel">
        <div class="redroid-panel__header">
          <div>
            <h3>创建云手机</h3>
            <p>{{ createForm.model.manufacturer }} {{ createForm.model.modelCode }}</p>
          </div>
        </div>

        <div class="redroid-form-grid">
          <label>
            <span>容器名</span>
            <input v-model.trim="createForm.name" />
          </label>
          <label>
            <span>ADB 端口</span>
            <input v-model.number="createForm.adbPort" type="number" min="1" max="65535" />
          </label>
          <label>
            <span>视频设备</span>
            <select v-model.number="createForm.videoNr">
              <option v-for="nr in [20, 21, 22, 23, 24, 25, 26, 27]" :key="nr" :value="nr">
                /dev/video{{ nr }}
              </option>
            </select>
          </label>
          <label>
            <span>镜像</span>
            <input v-model.trim="createForm.image" />
          </label>
        </div>

        <div class="redroid-model-search">
          <input v-model.trim="modelQuery" placeholder="搜索 Pixel、SM-S911B、sailfish..." @keyup.enter="loadModels()" />
          <button type="button" @click="loadModels()">搜索</button>
          <button type="button" @click="loadModels({ refresh: true })">更新表</button>
        </div>

        <div class="redroid-model-list">
          <button
            v-for="model in models"
            :key="model.id"
            type="button"
            class="redroid-model-option"
            @click="applyModel(model)"
          >
            <strong>{{ model.modelCode }}</strong>
            <span>{{ model.label }}</span>
          </button>
        </div>

        <div class="redroid-form-grid">
          <label>
            <span>品牌</span>
            <input v-model.trim="createForm.model.brand" />
          </label>
          <label>
            <span>厂商</span>
            <input v-model.trim="createForm.model.manufacturer" />
          </label>
          <label>
            <span>型号</span>
            <input v-model.trim="createForm.model.modelCode" />
          </label>
          <label>
            <span>设备代号</span>
            <input v-model.trim="createForm.model.device" />
          </label>
          <label>
            <span>产品名</span>
            <input v-model.trim="createForm.model.productName" />
          </label>
          <label>
            <span>显示名</span>
            <input v-model.trim="createForm.model.marketingName" />
          </label>
          <label>
            <span>宽</span>
            <input v-model.number="createForm.width" type="number" min="320" />
          </label>
          <label>
            <span>高</span>
            <input v-model.number="createForm.height" type="number" min="320" />
          </label>
          <label>
            <span>DPI</span>
            <input v-model.number="createForm.dpi" type="number" min="120" />
          </label>
          <label>
            <span>FPS</span>
            <input v-model.number="createForm.fps" type="number" min="15" />
          </label>
        </div>

        <button
          type="button"
          class="redroid-primary"
          :disabled="actionLoading"
          @click="handleCreateInstance"
        >
          <AppIcon name="server" />
          <span>创建容器</span>
        </button>

        <p v-if="modelsMeta" class="redroid-note">
          机型表来源：{{ modelsMeta.source }} · {{ modelsMeta.sourceLicense }} · {{ modelsMeta.total }} 条匹配
        </p>
      </section>

      <section class="redroid-panel redroid-panel--wide">
        <div class="redroid-panel__header">
          <div>
            <h3>ReDroid 容器</h3>
            <p>{{ instances.length }} 个容器</p>
          </div>
        </div>

        <div class="redroid-instance-list">
          <article v-for="instance in instances" :key="instance.id" class="redroid-instance">
            <div>
              <strong>{{ instance.name }}</strong>
              <p>{{ instance.image }} · ADB {{ instance.adbPort || "-" }} · /dev/video{{ instance.videoNr ?? "-" }}</p>
              <p>{{ instance.model.manufacturer || "-" }} {{ instance.model.modelCode || "" }} {{ instance.model.device || "" }}</p>
            </div>
            <div class="redroid-instance__actions">
              <span :class="['redroid-state', { 'redroid-state--on': instance.running }]">
                {{ instance.state }}
              </span>
              <button type="button" title="启动" :disabled="actionLoading || instance.running" @click="runInstanceAction(instance, 'start')">
                <AppIcon name="play" />
              </button>
              <button type="button" title="停止" :disabled="actionLoading || !instance.running" @click="runInstanceAction(instance, 'stop')">
                <AppIcon name="square" />
              </button>
              <button type="button" title="删除" :disabled="actionLoading" @click="runInstanceAction(instance, 'delete')">
                <AppIcon name="trash" />
              </button>
            </div>
          </article>
          <p v-if="!instances.length && !loading" class="redroid-note">还没有 ReDroid 容器。</p>
        </div>
      </section>
    </div>
  </section>
</template>
