<script setup>
defineProps({
  deviceOptions: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <fieldset class="mirror-settings__group">
    <legend>设备</legend>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.showTouches" type="checkbox" />
      <span>显示触摸点</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.stayAwake" type="checkbox" />
      <span>保持唤醒</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.turnScreenOff" type="checkbox" />
      <span>关闭设备屏幕</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.powerOn" type="checkbox" />
      <span>启动时点亮屏幕</span>
    </label>

    <p class="mirror-settings__hint">补充：控制注入、剪贴板同步等将在后续版本提供。</p>
  </fieldset>
</template>
