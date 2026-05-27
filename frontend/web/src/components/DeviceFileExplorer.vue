<script setup>
import { computed, ref, watch } from "vue";

import AppIcon from "./AppIcon.vue";
import { fetchDeviceFiles } from "../utils/device-files-api.js";
import { formatFileSize } from "../utils/device-files-format.js";
import {
  DEVICE_FILES_DEFAULT_OPEN,
  DEVICE_FS_ROOT,
  joinDevicePath,
  normalizeDevicePath,
} from "../utils/device-file-path.js";
import { getErrorMessage } from "../utils/api.js";

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const loading = ref(false);
const errorMessage = ref("");
const addressInput = ref(DEVICE_FILES_DEFAULT_OPEN);
const currentPath = ref(DEVICE_FILES_DEFAULT_OPEN);
const parentPath = ref(null);
const atRoot = ref(false);
const entries = ref([]);
const navHistory = ref([DEVICE_FILES_DEFAULT_OPEN]);
const navIndex = ref(0);

const canGoBack = computed(() => navIndex.value > 0);
const canGoForward = computed(() => navIndex.value < navHistory.value.length - 1);
const isEmpty = computed(() => !loading.value && !errorMessage.value && entries.value.length === 0);

const backButtonTitle = computed(() => (canGoBack.value ? "后退" : "没有可后退的记录"));
const forwardButtonTitle = computed(() => (canGoForward.value ? "前进" : "没有可前进的记录"));
const upButtonTitle = computed(() => {
  if (atRoot.value) {
    return "已在文件系统根目录（/），无法继续向上";
  }

  return parentPath.value ? `上一级：${parentPath.value}` : "上一级";
});

function rememberHistory(path) {
  const normalized = path || DEVICE_FILES_DEFAULT_OPEN;

  if (navHistory.value[navIndex.value] === normalized) {
    return;
  }

  navHistory.value = navHistory.value.slice(0, navIndex.value + 1);
  navHistory.value.push(normalized);
  navIndex.value = navHistory.value.length - 1;
}

async function loadDirectory(path = currentPath.value, options = {}) {
  if (!props.device?.serial) {
    errorMessage.value = "设备序列号无效";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const listing = await fetchDeviceFiles(props.device.serial, path);
    currentPath.value = listing.path ?? DEVICE_FILES_DEFAULT_OPEN;
    addressInput.value = currentPath.value;
    parentPath.value = listing.parentPath ?? null;
    atRoot.value = listing.atRoot ?? currentPath.value === DEVICE_FS_ROOT;
    entries.value = listing.entries ?? [];

    if (!options.fromHistory) {
      rememberHistory(currentPath.value);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "读取目录失败");
    entries.value = [];
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit("close");
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose();
  }
}

function goBack() {
  if (!canGoBack.value || loading.value) {
    return;
  }

  navIndex.value -= 1;
  void loadDirectory(navHistory.value[navIndex.value], { fromHistory: true });
}

function goForward() {
  if (!canGoForward.value || loading.value) {
    return;
  }

  navIndex.value += 1;
  void loadDirectory(navHistory.value[navIndex.value], { fromHistory: true });
}

function goUp() {
  if (loading.value) {
    return;
  }

  if (atRoot.value || parentPath.value == null) {
    errorMessage.value = "已在文件系统根目录（/），无法继续向上";
    return;
  }

  void loadDirectory(parentPath.value);
}

function goToAddress() {
  const trimmed = addressInput.value.trim();
  const next = trimmed === "" ? DEVICE_FS_ROOT : trimmed;
  void loadDirectory(next);
}

function openEntry(entry) {
  if (entry.type === "file") {
    return;
  }

  if (entry.type === "directory") {
    void loadDirectory(joinDevicePath(currentPath.value, entry.name));
    return;
  }

  if (entry.type === "symlink" && entry.linkTarget) {
    try {
      const target = entry.linkTarget.startsWith("/")
        ? normalizeDevicePath(entry.linkTarget)
        : joinDevicePath(currentPath.value, entry.linkTarget);
      void loadDirectory(target);
    } catch (error) {
      errorMessage.value = getErrorMessage(error, "无法打开链接目标");
    }
  }
}

function entryIcon(entry) {
  if (entry.type === "directory") {
    return "folder-open";
  }

  if (entry.type === "symlink") {
    return "link";
  }

  return "file";
}

function entrySizeLabel(entry) {
  if (entry.type === "directory") {
    return "—";
  }

  return formatFileSize(entry.size);
}

function resetExplorer() {
  navHistory.value = [DEVICE_FILES_DEFAULT_OPEN];
  navIndex.value = 0;
  currentPath.value = DEVICE_FILES_DEFAULT_OPEN;
  addressInput.value = DEVICE_FILES_DEFAULT_OPEN;
  parentPath.value = null;
  atRoot.value = false;
  errorMessage.value = "";
  entries.value = [];
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetExplorer();
      void loadDirectory(DEVICE_FILES_DEFAULT_OPEN, { fromHistory: true });
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="device-files-overlay"
      role="presentation"
      @click="handleBackdropClick"
    >
      <section
        class="device-files"
        role="dialog"
        aria-modal="true"
        aria-label="文件管理"
        @click.stop
      >
        <header class="device-files__header">
          <div class="device-files__title">
            <AppIcon name="folder" />
            <div>
              <h3>文件管理</h3>
              <p>{{ device.displayName }} · {{ device.serial }}</p>
            </div>
          </div>
          <button type="button" class="device-files__close" title="关闭" @click="handleClose">
            ×
          </button>
        </header>

        <div class="device-files__nav">
          <button
            type="button"
            class="device-files__nav-btn"
            :disabled="!canGoBack || loading"
            :title="backButtonTitle"
            @click="goBack"
          >
            <AppIcon name="chevron-left" />
          </button>
          <button
            type="button"
            class="device-files__nav-btn"
            :disabled="!canGoForward || loading"
            :title="forwardButtonTitle"
            @click="goForward"
          >
            <AppIcon name="chevron-right" />
          </button>
          <button
            type="button"
            class="device-files__nav-btn"
            :disabled="loading"
            :title="upButtonTitle"
            @click="goUp"
          >
            <AppIcon name="chevron-up" />
          </button>
          <button
            type="button"
            class="device-files__nav-btn"
            :disabled="loading"
            title="刷新"
            @click="loadDirectory(currentPath)"
          >
            <AppIcon name="refresh" />
          </button>
          <form class="device-files__address" @submit.prevent="goToAddress">
            <label class="visually-hidden" for="device-files-path">路径</label>
            <input
              id="device-files-path"
              v-model="addressInput"
              type="text"
              class="device-files__address-input"
              spellcheck="false"
              autocomplete="off"
              :disabled="loading"
            />
            <button type="submit" class="device-files__address-go" :disabled="loading">
              前往
            </button>
          </form>
        </div>

        <div class="device-files__list-head" aria-hidden="true">
          <span class="device-files__col device-files__col--name">名称</span>
          <span class="device-files__col device-files__col--size">大小</span>
          <span class="device-files__col device-files__col--modified">修改时间</span>
        </div>

        <div class="device-files__body">
          <p v-if="loading" class="device-files__status">正在读取目录…</p>
          <p v-else-if="errorMessage" class="device-files__status device-files__status--error">
            {{ errorMessage }}
          </p>
          <p v-else-if="isEmpty" class="device-files__status">此文件夹为空</p>
          <ul v-else class="device-files__entries" role="list">
            <li
              v-for="entry in entries"
              :key="entry.name"
              class="device-files__row"
              :class="{
                'device-files__row--dir': entry.type === 'directory',
                'device-files__row--link': entry.type === 'symlink',
              }"
            >
              <button
                type="button"
                class="device-files__entry"
                @click="openEntry(entry)"
              >
                <span class="device-files__col device-files__col--name">
                  <AppIcon :name="entryIcon(entry)" class="device-files__entry-icon" />
                  <span class="device-files__entry-name">{{ entry.name }}</span>
                </span>
                <span class="device-files__col device-files__col--size">
                  {{ entrySizeLabel(entry) }}
                </span>
                <span class="device-files__col device-files__col--modified">
                  {{ entry.modified || "—" }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <footer class="device-files__footer">
          <span>{{ entries.length }} 项</span>
          <span class="device-files__footer-path">{{ currentPath }}</span>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
