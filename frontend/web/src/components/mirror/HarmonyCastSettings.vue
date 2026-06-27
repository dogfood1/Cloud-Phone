<script setup>
import { computed, ref, watch } from "vue";
import { NForm, NFormItem, NSlider, NText } from "naive-ui";

import { buildHarmonyCastOptions } from "../../utils/harmony-cast-options.js";

const props = defineProps({
  device: {
    type: Object,
    default: () => ({}),
  },
  casting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["settings-change"]);

const scale = ref(1);
const quality = ref(30);

const nativeResolutionLabel = computed(() => {
  const size = props.device?.displaySize;

  if (size?.width > 0 && size?.height > 0) {
    return `${size.width} × ${size.height}`;
  }

  return "未知（投屏时将自动读取）";
});

watch([scale, quality], () => {
  emit("settings-change");
});

function getSettings() {
  return buildHarmonyCastOptions(props.device, { scale: scale.value, quality: quality.value });
}

defineExpose({ getSettings });
</script>

<template>
  <div class="harmony-cast-settings">
    <NText depth="3" style="display: block; margin-bottom: 8px">
      设备分辨率：{{ nativeResolutionLabel }}（默认按原生采集，scale=1）
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
