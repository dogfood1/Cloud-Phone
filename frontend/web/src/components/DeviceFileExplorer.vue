<script setup>
import { computed, ref, watch } from "vue";

import AppIcon from "./AppIcon.vue";
import { fetchDeviceFiles } from "../utils/device-files-api.js";
import { formatFileSize } from "../utils/device-files-format.js";
import { joinDisplayPath, toDisplayPath } from "../utils/device-file-path.js";
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
const addressInput = ref("/");
const displayPath = ref("/");
const parentDisplayPath = ref(null);
const entries = ref([]);

const canGoUp = computed(() => parentDisplayPath.value != null);
const isEmpty = computed(() => !loading.value && !errorMessage.value && entries.value.length === 0);

async function loadDirectory(path = displayPath.value) {
  if (!props.device?.serial) {
    errorMessage.value = "设备序列号无效";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const listing = await fetchDeviceFiles(props.device.serial, path);
    displayPath.value = listing.displayPath ?? "/";
    addressInput.value = displayPath.value;
    parentDisplayPath.value = listing.parentDisplayPath ?? null;
    entries.value = listing.entries ?? [];
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

function goUp() {
  if (parentDisplayPath.value != null) {
    void loadDirectory(parentDisplayPath.value);
  }
}

function goToAddress() {
  const next = addressInput.value.trim() || "/";
  void loadDirectory(next.startsWith("/") ? next : `/${next}`);
}

function openEntry(entry) {
  if (entry.type === "file") {
    return;
  }

  if (entry.type === "directory") {
    void loadDirectory(joinDisplayPath(displayPath.value, entry.name));
    return;
  }

  if (entry.type === "symlink" && entry.linkTarget) {
    const target = entry.linkTarget.startsWith("/")
      ? toDisplayPath(entry.linkTarget)
      : joinDisplayPath(displayPath.value, entry.linkTarget);
    void loadDirectory(target);
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

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      displayPath.value = "/";
      addressInput.value = "/";
      void loadDirectory("/");
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
            :disabled="!canGoUp || loading"
            title="上一级"
            @click="goUp"
          >
            <AppIcon name="chevron-up" />
          </button>
          <button
            type="button"
            class="device-files__nav-btn"
            :disabled="loading"
            title="刷新"
            @click="loadDirectory(displayPath)"
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
          <span class="device-files__footer-path">{{ displayPath }}</span>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
