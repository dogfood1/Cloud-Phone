<script setup>
import { NCollapseItem, NForm, NInputNumber, NSwitch } from "naive-ui";

import MirrorSettingRow from "./MirrorSettingRow.vue";

defineProps({
  deviceOptions: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <NCollapseItem title="设备" name="device">
    <NForm size="small" label-placement="left">
      <MirrorSettingRow label="显示触摸点" help="在投屏画面上叠加触摸位置指示，便于演示操作。" variant="checkbox">
        <template #control>
          <NSwitch v-model:value="deviceOptions.showTouches" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="保持唤醒"
        help="投屏期间尽量保持设备唤醒，避免系统自动休眠中断会话。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="deviceOptions.stayAwake" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="关闭设备屏幕"
        help="对应 --turn-screen-off：开始投屏后自动熄屏；投屏中可用工具栏「关屏/亮屏」切换。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="deviceOptions.turnScreenOff" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="启动时点亮屏幕"
        help="开始投屏时尝试点亮设备屏幕（与「不自动点亮」互斥）。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch
            v-model:value="deviceOptions.powerOn"
            :disabled="deviceOptions.noPowerOn"
          />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow label="不自动点亮" help="对应 --no-power-on：连接时不主动点亮屏幕。" variant="checkbox">
        <template #control>
          <NSwitch v-model:value="deviceOptions.noPowerOn" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="保持虚拟显示活跃"
        help="对应 --keep-active：周期性注入活动，降低虚拟显示被系统回收的概率。"
        variant="checkbox"
      >
        <template #control>
          <NSwitch v-model:value="deviceOptions.keepActive" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="熄屏超时（秒）"
        help="对应 --screen-off-timeout；0 表示使用系统默认。仅部分场景生效。"
      >
        <NInputNumber
          v-model:value="deviceOptions.screenOffTimeout"
          :min="0"
          :max="86400"
          :step="1"
          placeholder="0 = 默认"
          style="width: 100%"
        />
      </MirrorSettingRow>

      <MirrorSettingRow
        label="设备类参数经 WebSocket type 101 的 codecOptions 同步到设备端 scrcpy-server。"
        variant="banner"
        help="连接建立后由浏览器下发；投屏中修改需停止后重新开始（设置已锁定）。"
      />
    </NForm>
  </NCollapseItem>
</template>
