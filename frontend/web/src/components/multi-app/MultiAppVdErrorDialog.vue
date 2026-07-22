<script setup>
import { computed } from "vue";
import { NModal } from "naive-ui";

import UiButton from "../ui/UiButton.vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  detail: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:show", "close-window", "switch-mirror", "retry"]);

const bodyText = computed(() => {
  const detail = String(props.detail || "").trim();
  if (detail.includes("当前设备系统不允许创建虚拟显示")) {
    return detail;
  }
  return (
    "当前设备系统不允许创建虚拟显示（常见于 Android 15 / 部分华为等机型缺少 ADD_TRUSTED_DISPLAY 权限）。"
    + "多应用独立窗口依赖虚拟屏，因此无法在此设备上使用。"
    + (detail ? `\n\n技术详情：${detail}` : "")
  );
});

function closeModal() {
  emit("update:show", false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="无法创建虚拟屏"
    :mask-closable="false"
    style="width: min(460px, 92vw)"
    @update:show="(open) => emit('update:show', open)"
  >
    <p class="multi-app-vd-error__body">{{ bodyText }}</p>
    <ul class="multi-app-vd-error__tips">
      <li>可改用「镜像投屏」操作主屏幕</li>
      <li>或等待厂商系统升级（官方 scrcpy 在 Android 16 起恢复该权限）</li>
      <li>部分机型可尝试解锁屏幕后重试</li>
    </ul>
    <div class="multi-app-vd-error__actions">
      <UiButton
        variant="ghost"
        @click="
          closeModal();
          emit('close-window');
        "
      >
        关闭窗口
      </UiButton>
      <UiButton
        variant="ghost"
        @click="
          closeModal();
          emit('retry');
        "
      >
        重试
      </UiButton>
      <UiButton
        variant="primary"
        @click="
          closeModal();
          emit('switch-mirror');
        "
      >
        切换镜像投屏
      </UiButton>
    </div>
  </NModal>
</template>

<style scoped>
.multi-app-vd-error__body {
  margin: 0 0 0.85rem;
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.92rem;
  white-space: pre-wrap;
}

.multi-app-vd-error__tips {
  margin: 0 0 1.1rem;
  padding-left: 1.15rem;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.5;
}

.multi-app-vd-error__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}
</style>
