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

    <label class="mirror-settings__check mirror-settings__field--disabled">
      <input v-model="deviceOptions.turnScreenOff" type="checkbox" disabled />
      <span>关闭设备屏幕</span>
      <span class="mirror-settings__field-hint">桌面 scrcpy --turn-screen-off；网页投屏请用工具栏「关屏」</span>
    </label>

    <label class="mirror-settings__check">
      <input
        v-model="deviceOptions.powerOn"
        type="checkbox"
        :disabled="deviceOptions.noPowerOn"
      />
      <span>启动时点亮屏幕</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.noPowerOn" type="checkbox" />
      <span>不自动点亮（--no-power-on）</span>
    </label>

    <label class="mirror-settings__check">
      <input v-model="deviceOptions.keepActive" type="checkbox" />
      <span>保持虚拟显示活跃（--keep-active）</span>
    </label>

    <label class="mirror-settings__field">
      <span>熄屏超时（秒，0=默认）</span>
      <input
        v-model.number="deviceOptions.screenOffTimeout"
        type="number"
        min="0"
        max="86400"
        step="1"
      />
      <span class="mirror-settings__field-hint">对应 --screen-off-timeout，仅部分场景生效</span>
    </label>

    <p class="mirror-settings__hint">设备项经 WebSocket type 101 的 codecOptions 下发到 scrcpy-server。</p>
  </fieldset>
</template>
