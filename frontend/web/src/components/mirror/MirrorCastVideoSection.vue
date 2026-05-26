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

    <label class="mirror-settings__check">
      <input v-model="video.disabled" type="checkbox" />
      <span>禁用视频（仅音频）</span>
      <span class="mirror-settings__field-hint">
        开启后画布显示音频波纹；需 Android 11+。音频编码/源设置仍在完善中。
      </span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>视频编码器</span>
      <select v-model="video.encoder" :disabled="video.disabled || !encoderOptions.length">
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

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>比特率 (Mbps)</span>
      <input
        v-model.number="video.bitRateMbps"
        type="number"
        min="1"
        max="100"
        step="0.5"
        :disabled="video.disabled"
      />
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>刷新率 (fps)</span>
      <input
        v-model.number="video.maxFps"
        type="number"
        min="1"
        max="120"
        step="1"
        :disabled="video.disabled"
      />
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>分辨率</span>
      <select v-model="video.resolution" :disabled="video.disabled">
        <option v-for="item in MIRROR_RESOLUTIONS" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <span class="mirror-settings__field-hint">{{ resolutionHint }}</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>裁剪区域</span>
      <input
        v-model="video.crop"
        type="text"
        placeholder="宽:高:x:y，例如 1080:1920:0:0"
        spellcheck="false"
        :disabled="video.disabled"
      />
      <span class="mirror-settings__field-hint">对应 scrcpy --crop，通过 WebSocket 下发到设备</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>显示方向（采集）</span>
      <select v-model="video.captureOrientation" :disabled="video.disabled">
        <option
          v-for="item in MIRROR_CAPTURE_ORIENTATIONS"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
      <span class="mirror-settings__field-hint">
        对应 scrcpy --display-orientation：旋转编码后的画面（不是只转浏览器预览）。
        0° = 跟随设备旋转；90°/180°/270° = 锁定采集方向。需先开始投屏再改，约 1 秒后生效。
      </span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>关键帧间隔 (秒)</span>
      <input
        v-model.number="video.iFrameInterval"
        type="number"
        min="1"
        max="60"
        step="1"
        :disabled="video.disabled"
      />
      <span class="mirror-settings__field-hint">连接后通过 WebSocket 下发，部分机型可能忽略</span>
    </label>

    <label class="mirror-settings__field" :class="{ 'mirror-settings__field--disabled': video.disabled }">
      <span>预览旋转 (°)</span>
      <input
        v-model.number="video.rotationDeg"
        type="number"
        min="0"
        max="360"
        step="90"
        :disabled="video.disabled"
      />
      <span class="mirror-settings__field-hint">
        只旋转浏览器里的预览画布；要旋转投屏视频本身请改「显示方向（采集）」。
      </span>
    </label>

    <p v-if="casting" class="mirror-settings__field-hint">
      投屏中修改视频项后，将自动重新下发编码参数（约 1 秒内）。
    </p>
  </fieldset>
</template>
