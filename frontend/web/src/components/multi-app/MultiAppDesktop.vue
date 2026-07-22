<script setup>
import WindowsTaskbar from "./WindowsTaskbar.vue";

defineProps({
  device: {
    type: Object,
    required: true,
  },
});

defineEmits(["exit"]);
</script>

<template>
  <div class="multi-app-desktop">
    <div class="multi-app-desktop__wallpaper" aria-hidden="true" />
    <div class="multi-app-desktop__canvas" aria-label="Windows 桌面">
      <div class="multi-app-desktop__hint">
        <p>多应用投屏桌面</p>
        <span>任务栏已就绪；应用窗口与投屏画布将在后续步骤接入。</span>
      </div>
    </div>
    <WindowsTaskbar :serial="device.serial" @exit="$emit('exit')" />
  </div>
</template>
