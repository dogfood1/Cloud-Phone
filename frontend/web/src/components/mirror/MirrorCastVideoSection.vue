<script setup>
import { computed } from "vue";

import { MIRROR_CAPTURE_ORIENTATIONS, MIRROR_RESOLUTIONS } from "../../utils/mirror-cast-constants.js";
import { buildEncoderSelectOptions } from "../../utils/mirror-encoder-utils.js";

const props = defineProps({
  video: {
    type: Object,
    required: true,
  },
  videoEncoders: {
    type: Array,
    required: true,
  },
  encodersLoading: {
    type: Boolean,
    default: false,
  },
  encodersError: {
    type: String,
    default: "",
  },
  casting: {
    type: Boolean,
    default: false,
  },
});

const encoderOptions = computed(() => buildEncoderSelectOptions(props.videoEncoders));

const resolutionHint = computed(() => {
  const item = MIRROR_RESOLUTIONS.find((entry) => entry.value === props.video.resolution);
  if (!item || item.maxSize === 0) {
    return "不限制长边，由设备分辨率决定";
  }
  return `编码长边不超过 ${item.maxSize}px`;
});
</script>

<template>
  <fieldset class="mirror-settings__group">
    <legend>视频</legend>

    <label class="mirror-settings__check mirror-settings__field--disabled">
      <input v-model="video.disabled" type="checkbox" disabled />
      <span>禁用视频</span>
      <span class="mirror-settings__field-hint">网页投屏需保持视频开启</span>
    </label>

    <label class="mirror-settings__field">
      <span>视频编码器</span>
      <select v-model="video.encoder" :disabled="!encoderOptions.length">
        <option v-for="item in encoderOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span v-if="encodersLoading" class="mirror-settings__field-hint">
        正在从设备加载编码器列表（最多约 15 秒）…
      </span>
      <span v-else-if="encodersError" class="mirror-settings__field-hint mirror-settings__field-hint--error">
        {{ encodersError }}
      </span>
      <span v-else-if="!encoderOptions.length" class="mirror-settings__field-hint">
        未获取到编码器，请确认设备已连接并刷新页面。
      </span>
      <span v-else class="mirror-settings__field-hint">
        列表第一项为默认；网页投屏请优先选 H264 条目
      </span>
    </label>

    <label class="mirror-settings__field">
      <span>比特率 (Mbps)</span>
      <input v-model.number="video.bitRateMbps" type="number" min="1" max="100" step="0.5" />
    </label>

    <label class="mirror-settings__field">
      <span>刷新率 (fps)</span>
      <input v-model.number="video.maxFps" type="number" min="1" max="120" step="1" />
    </label>

    <label class="mirror-settings__field">
      <span>分辨率</span>
      <select v-model="video.resolution">
        <option v-for="item in MIRROR_RESOLUTIONS" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span class="mirror-settings__field-hint">{{ resolutionHint }}</span>
    </label>

    <label class="mirror-settings__field">
      <span>裁剪区域</span>
      <input
        v-model="video.crop"
        type="text"
        placeholder="宽:高:x:y，例如 1080:1920:0:0"
        spellcheck="false"
      />
      <span class="mirror-settings__field-hint">对应 scrcpy --crop，通过 WebSocket 下发到设备</span>
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
      <span class="mirror-settings__field-hint">非 0° 时将锁定设备端采集方向</span>
    </label>

    <label class="mirror-settings__field">
      <span>关键帧间隔 (秒)</span>
      <input v-model.number="video.iFrameInterval" type="number" min="1" max="60" step="1" />
      <span class="mirror-settings__field-hint">连接后通过 WebSocket 下发，部分机型可能忽略</span>
    </label>

    <label class="mirror-settings__field">
      <span>预览旋转 (°)</span>
      <input v-model.number="video.rotationDeg" type="number" min="0" max="360" step="90" />
      <span class="mirror-settings__field-hint">仅旋转浏览器画布，不影响设备采集</span>
    </label>

    <p v-if="casting" class="mirror-settings__field-hint">
      投屏中修改视频项后，将自动重新下发编码参数（约 1 秒内）。
    </p>
  </fieldset>
</template>
