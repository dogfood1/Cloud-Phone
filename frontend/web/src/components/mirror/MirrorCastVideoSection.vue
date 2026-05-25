<script setup>
import { MIRROR_CAPTURE_ORIENTATIONS, MIRROR_RESOLUTIONS } from "../../utils/mirror-cast-constants.js";

defineProps({
  video: {
    type: Object,
    required: true,
  },
  videoEncoders: {
    type: Array,
    required: true,
  },
});
</script>

<template>
  <fieldset class="mirror-settings__group">
    <legend>视频</legend>

    <label class="mirror-settings__check">
      <input v-model="video.disabled" type="checkbox" />
      <span>禁用视频</span>
    </label>

    <label class="mirror-settings__field">
      <span>比特率 (M)</span>
      <input v-model.number="video.bitRateMbps" type="number" min="1" max="100" step="0.5" />
    </label>

    <label class="mirror-settings__field">
      <span>视频编码器</span>
      <select v-model="video.encoder">
        <option v-for="item in videoEncoders" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field">
      <span>旋转角度 (°)</span>
      <input v-model.number="video.rotationDeg" type="number" min="0" max="360" step="1" />
    </label>

    <label class="mirror-settings__field">
      <span>显示方向</span>
      <select v-model="video.captureOrientation">
        <option
          v-for="item in MIRROR_CAPTURE_ORIENTATIONS"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
    </label>

    <label class="mirror-settings__field">
      <span>刷新率 (fps)</span>
      <input v-model.number="video.maxFps" type="number" min="1" max="240" step="1" />
    </label>

    <label class="mirror-settings__field">
      <span>分辨率</span>
      <select v-model="video.resolution">
        <option v-for="item in MIRROR_RESOLUTIONS" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </label>
  </fieldset>
</template>
