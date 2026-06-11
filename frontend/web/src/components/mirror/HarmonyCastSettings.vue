<script setup>
import { ref, watch } from "vue";
import { NForm, NFormItem, NSlider, NText } from "naive-ui";

import { buildHarmonyCastOptions } from "../../utils/harmony-cast-options.js";

const props = defineProps({
  casting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["settings-change"]);

const scale = ref(0.5);
const quality = ref(30);

watch([scale, quality], () => {
  emit("settings-change");
});

function getSettings() {
  return buildHarmonyCastOptions({}, { scale: scale.value, quality: quality.value });
}

defineExpose({ getSettings });
</script>

<template>
  <div class="harmony-cast-settings">
    <NText depth="3" style="display: block; margin-bottom: 12px; font-size: 0.82rem">
      鸿蒙投屏使用 uitest JPEG 流，不支持 scrcpy 的编码器/码率/帧率参数。可调画质缩放与 JPEG 质量。
    </NText>
    <NForm size="small" :show-feedback="false">
      <NFormItem label="画面缩放 (scale)" label-placement="top">
        <NSlider
          v-model:value="scale"
          :min="0.2"
          :max="1"
          :step="0.05"
          :disabled="casting"
        />
      </NFormItem>
      <NFormItem label="JPEG 质量" label-placement="top">
        <NSlider
          v-model:value="quality"
          :min="5"
          :max="95"
          :step="1"
          :disabled="casting"
        />
      </NFormItem>
    </NForm>
  </div>
</template>
