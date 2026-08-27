<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import AppIcon from "./AppIcon.vue";
import PageHeader from "./ui/PageHeader.vue";
import PanelAlert from "./ui/PanelAlert.vue";
import {
  createRedroidInstance,
  deleteRedroidInstance,
  fetchRedroidModelBrands,
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
const brands = ref([]);
const brandsMeta = ref(null);
const models = ref([]);
const modelsMeta = ref(null);
const modelQuery = ref("");
const selectedSourceKey = ref("google");
const selectedModelId = ref("");
const brandLoading = ref(false);
const modelLoading = ref(false);
const selectedImage = ref(null);
const selectedImagePreview = ref("");
const cameraFitMode = ref("cover");
const cameraMirror = ref(false);

const CAMERA_IMAGE_FIT_OPTIONS = [
  { label: "填满裁剪", value: "cover" },
  { label: "完整显示", value: "contain" },
  { label: "拉伸填满", value: "stretch" },
];

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
const selectedSourceLabel = computed(() => {
  const source = brands.value.find((brand) => brand.key === selectedSourceKey.value);
  return source?.label || createForm.model.manufacturer || "厂商";
});
const selectedModelLabel = computed(() => {
  const model = models.value.find((item) => item.id === selectedModelId.value);
  if (model) {
    return model.label || `${model.manufacturer} ${model.modelCode}`;
  }

  if (!createForm.model.modelCode) {
    return "";
  }

  return `${createForm.model.manufacturer} ${createForm.model.marketingName || createForm.model.modelCode}`;
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

async function loadBrands(options = {}) {
  brandLoading.value = true;
  try {
    const payload = await fetchRedroidModelBrands({
      refresh: options.refresh,
    });
    brands.value = payload.brands ?? [];
    brandsMeta.value = payload;

    if (!brands.value.some((brand) => brand.key === selectedSourceKey.value)) {
      selectedSourceKey.value =
        brands.value.find((brand) => brand.key === "google")?.key ||
        brands.value[0]?.key ||
        "";
    }
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "加载厂商列表失败。");
  } finally {
    brandLoading.value = false;
  }
}

async function loadModels(options = {}) {
  modelLoading.value = true;
  try {
    const payload = await fetchRedroidModels({
      source: selectedSourceKey.value,
      query: modelQuery.value,
      limit: 1000,
      refresh: options.refresh,
    });
    models.value = payload.models ?? [];
    modelsMeta.value = payload;

    const currentModel = models.value.find((model) => model.id === selectedModelId.value);
    const nextModel = currentModel || (options.applyFirst ? models.value[0] : null);

    if (nextModel) {
      applyModel(nextModel, { silent: options.silent });
    } else if (!currentModel) {
      selectedModelId.value = "";
    }
  } catch (requestError) {
    error.value = getErrorMessage(requestError, "加载机型列表失败。");
  } finally {
    modelLoading.value = false;
  }
}

function applyModel(model, options = {}) {
  selectedModelId.value = model.id || "";
  createForm.model.brand = model.brand || model.manufacturer || "Google";
  createForm.model.manufacturer = model.manufacturer || model.brand || "Google";
  createForm.model.modelCode = model.modelCode || model.model || "";
  createForm.model.marketingName = model.marketingName || "";
  createForm.model.device = model.device || model.codename || "";
  createForm.model.productName = model.productName || model.device || model.codename || "";
  if (!options.silent) {
    feedback.value = `已选择 ${model.label || model.modelCode}`;
  }
}

async function handleBrandChanged() {
  selectedModelId.value = "";
  modelQuery.value = "";
  await loadModels({ applyFirst: true });
}

function handleModelChanged() {
  const model = models.value.find((item) => item.id === selectedModelId.value);
  if (model) {
    applyModel(model);
  }
}

async function refreshModelData() {
  await loadBrands({ refresh: true });
  await loadModels({ applyFirst: true });
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
      fitMode: cameraFitMode.value,
      mirror: cameraMirror.value,
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
        fitMode: cameraFitMode.value,
        mirror: cameraMirror.value,
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
  await Promise.all([
    loadStatus(),
    (async () => {
      await loadBrands();
      await loadModels({ applyFirst: true, silent: true });
    })(),
  ]);
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
          <img
            v-if="selectedImagePreview"
            :src="selectedImagePreview"
            :class="{ 'redroid-camera-preview--mirror': cameraMirror }"
            :style="{ objectFit: previewObjectFit(cameraFitMode) }"
            alt=""
          />
          <span v-else>选择图片作为虚拟摄像头画面</span>
        </label>

        <div class="redroid-camera-options">
          <label>
            <span>画面适配</span>
            <select v-model="cameraFitMode" :disabled="actionLoading">
              <option
                v-for="option in CAMERA_IMAGE_FIT_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="redroid-check">
            <input v-model="cameraMirror" type="checkbox" :disabled="actionLoading" />
            <span>手动镜像输入</span>
          </label>
        </div>

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
            <p>{{ selectedSourceLabel }} · {{ createForm.model.modelCode || "未选择型号" }}</p>
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

        <div class="redroid-model-picker">
          <label>
            <span>厂商</span>
            <select
              v-model="selectedSourceKey"
              :disabled="brandLoading || actionLoading || !brands.length"
              @change="handleBrandChanged"
            >
              <option v-if="!brands.length" value="">无可选厂商</option>
              <option v-for="brand in brands" :key="brand.key" :value="brand.key">
                {{ brand.label }} · {{ brand.count }} 款
              </option>
            </select>
          </label>

          <label>
            <span>型号</span>
            <select
              v-model="selectedModelId"
              :disabled="modelLoading || actionLoading || !models.length"
              @change="handleModelChanged"
            >
              <option v-if="!models.length" value="">无可选型号</option>
              <option v-for="model in models" :key="model.id" :value="model.id">
                {{ model.modelCode }} · {{ model.marketingName || model.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="redroid-model-search">
          <input
            v-model.trim="modelQuery"
            placeholder="在所选厂商内搜索型号、设备代号..."
            @keyup.enter="loadModels({ applyFirst: true })"
          />
          <button type="button" :disabled="modelLoading || !selectedSourceKey" @click="loadModels({ applyFirst: true })">
            {{ modelLoading ? "加载中" : "筛选" }}
          </button>
          <button
            type="button"
            :disabled="brandLoading || modelLoading"
            @click="refreshModelData"
          >
            更新表
          </button>
        </div>

        <p v-if="selectedModelLabel" class="redroid-model-summary">
          已选：{{ selectedModelLabel }}
        </p>

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
          机型表来源：{{ modelsMeta.source }} · {{ brandsMeta?.total ?? 0 }} 个厂商源 · {{ modelsMeta.total }} 条匹配
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
