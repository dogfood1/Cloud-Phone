<script setup>
import { computed, nextTick, ref, watch } from "vue";

import AppIcon from "./AppIcon.vue";
import { useAppFeedback } from "../composables/useAppFeedback.js";
import { getErrorMessage } from "../utils/api.js";
import {
  MAX_DEVICE_CLIPBOARD_BYTES,
  writeDeviceClipboard,
} from "../utils/device-clipboard-api.js";

const props = defineProps({
  device: { type: Object, required: true },
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const feedback = useAppFeedback();
const text = ref("");
const busy = ref(false);
const errorMessage = ref("");
const textareaRef = ref(null);
const byteLength = computed(() => new TextEncoder().encode(text.value).length);
const tooLarge = computed(() => byteLength.value > MAX_DEVICE_CLIPBOARD_BYTES);
const sizeLabel = computed(() =>
  `${byteLength.value.toLocaleString()} / ${MAX_DEVICE_CLIPBOARD_BYTES.toLocaleString()} 字节`,
);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    errorMessage.value = "";
    await nextTick();
    textareaRef.value?.focus();
  },
);

async function readLocalClipboard() {
  errorMessage.value = "";
  try {
    text.value = await navigator.clipboard.readText();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "无法读取本机剪切板");
  }
}

async function sendToDevice(value = text.value) {
  if (busy.value || tooLarge.value || !props.device?.connected) return;
  busy.value = true;
  errorMessage.value = "";
  try {
    const result = await writeDeviceClipboard(props.device.serial, value);
    if (result.cleared) {
      text.value = "";
      feedback.success("设备剪切板已清空");
    } else {
      feedback.success(`已发送 ${result.bytes.toLocaleString()} 字节到设备剪切板`);
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "发送到设备剪切板失败");
  } finally {
    busy.value = false;
  }
}

function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    void sendToDevice();
  }
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget && !busy.value) emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="device-files-overlay device-clipboard-overlay"
      @click="handleBackdropClick"
    >
      <section
        class="device-clipboard"
        role="dialog"
        aria-modal="true"
        aria-label="设备剪切板"
        @click.stop
      >
        <header class="device-files__header">
          <div class="device-files__title">
            <AppIcon name="clipboard-paste" />
            <div>
              <h3>设备剪切板</h3>
              <p>{{ device.displayName }} · {{ device.serial }}</p>
            </div>
          </div>
          <button
            type="button"
            class="device-files__close"
            title="关闭"
            :disabled="busy"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <div class="device-clipboard__body">
          <textarea
            ref="textareaRef"
            v-model="text"
            class="device-clipboard__input"
            rows="10"
            spellcheck="false"
            placeholder="输入要发送的内容"
            @keydown="handleKeydown"
          />
          <div class="device-clipboard__meta">
            <span :class="{ 'device-clipboard__size--error': tooLarge }">{{ sizeLabel }}</span>
            <button
              type="button"
              class="device-clipboard__secondary"
              :disabled="busy"
              @click="readLocalClipboard"
            >
              <AppIcon name="clipboard-copy" />
              <span>读取本机剪切板</span>
            </button>
          </div>
          <p v-if="errorMessage" class="device-clipboard__error">{{ errorMessage }}</p>
        </div>

        <footer class="device-clipboard__footer">
          <button
            type="button"
            class="device-clipboard__secondary"
            :disabled="busy || !device.connected"
            @click="sendToDevice('')"
          >
            清空设备剪切板
          </button>
          <button
            type="button"
            class="device-clipboard__primary"
            :disabled="busy || tooLarge || !device.connected"
            @click="sendToDevice()"
          >
            <AppIcon name="clipboard-paste" />
            <span>{{ busy ? "正在发送" : "发送到设备" }}</span>
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
