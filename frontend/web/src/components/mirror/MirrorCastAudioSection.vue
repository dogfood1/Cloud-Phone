<script setup>
import { computed, watch } from "vue";
import { NCollapseItem, NForm, NInputNumber, NSwitch } from "naive-ui";
import MirrorSearchableSelect from "./MirrorSearchableSelect.vue";

import { AUDIO_BITRATE_PRESETS_KBPS, MIRROR_AUDIO_SOURCES } from "../../utils/mirror-audio-constants.js";
import {
  ANDROID_SDK_AUDIO_DUP_MIN,
  isAudioDupSupported,
  parseDeviceSdk,
} from "../../utils/mirror-audio-platform.js";
import MirrorSettingRow from "./MirrorSettingRow.vue";

const props = defineProps({
  audio: {
    type: Object,
    required: true,
  },
  audioCodeOptions: {
    type: Array,
    required: true,
  },
  audioSources: {
    type: Array,
    required: true,
  },
  deviceSdk: {
    type: [Number, String],
    default: 0,
  },
  videoDisabled: {
    type: Boolean,
    default: false,
  },
  encodersLoading: {
    type: Boolean,
    default: false,
  },
});

const sdk = computed(() => parseDeviceSdk(props.deviceSdk));
const audioDupSupported = computed(() => isAudioDupSupported(props.deviceSdk));

const filteredAudioSources = computed(() => {
  const list = props.audioSources?.length ? props.audioSources : MIRROR_AUDIO_SOURCES;

  if (sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN) {
    return list.filter((item) => item.value !== "playback");
  }

  return list;
});

const audioActive = computed(() => props.videoDisabled || !props.audio.disabled);
const fieldsDisabled = computed(() => !audioActive.value);

const sourceOptions = computed(() =>
  filteredAudioSources.value.map((item) => ({ label: item.label, value: item.value })),
);

const audioCodeSelectOptions = computed(() =>
  props.audioCodeOptions.map((item) => ({ label: item.label, value: item.value })),
);

const bitRateOptions = computed(() =>
  AUDIO_BITRATE_PRESETS_KBPS.map((item) => ({ label: item.label, value: item.value })),
);

const webPcmHelp = computed(() => {
  const sdkHint =
    sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN
      ? `本机 SDK ${sdk.value}：--audio-dup / playback 需 Android 13（SDK ${ANDROID_SDK_AUDIO_DUP_MIN}）+；未勾选复制时手机静音，仅浏览器播放。`
      : "";

  if (!props.videoDisabled) {
    return ["Web 投屏与视频同传时使用 PCM 到浏览器。", sdkHint].filter(Boolean).join(" ");
  }

  return ["仅音频模式：48 kHz 立体声 PCM 经 WebSocket 播放。", sdkHint].filter(Boolean).join(" ");
});

const audioDupHelp = computed(() => {
  if (!audioDupSupported.value && sdk.value > 0) {
    return `需要 Android 13（SDK ${ANDROID_SDK_AUDIO_DUP_MIN}）及以上；本机仅浏览器出声。`;
  }
  if (audioDupSupported.value) {
    return "开启后使用 playback 源，手机与浏览器同时出声；关闭则仅浏览器播放。";
  }
  return "将设备播放的音频复制回扬声器（需 Android 13+ 与 playback 源）。";
});

const audioCodeHelp = computed(() => {
  if (props.encodersLoading) {
    return "正在加载设备音频编码器…";
  }
  return "对应 --audio-code；Web 投屏以 PCM 传输，此项主要对齐桌面 scrcpy 配置。";
});

watch(audioDupSupported, (supported) => {
  if (!supported) {
    props.audio.audioDup = false;
  }

  if (sdk.value > 0 && sdk.value < ANDROID_SDK_AUDIO_DUP_MIN && props.audio.source === "playback") {
    props.audio.source = "output";
  }
});
</script>

<template>
  <NCollapseItem title="音频" name="audio" :disabled="fieldsDisabled && !videoDisabled">
    <NForm size="small" label-placement="left">
      <MirrorSettingRow label="传输说明" variant="banner" :help="webPcmHelp" />

      <MirrorSettingRow
        v-if="!videoDisabled"
        label="禁用音频"
        help="对应 --no-audio；关闭后仅传输视频。"
        variant="checkbox"
      >
        <template #control>
          <!-- 须始终可点：fieldsDisabled 时其它项已灰，若此处也 disabled 则无法关闭「禁用音频」 -->
          <NSwitch v-model:value="audio.disabled" />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="音频复制到设备"
        :help="audioDupHelp"
        variant="checkbox"
      >
        <template #control>
          <NSwitch
            v-model:value="audio.audioDup"
            :disabled="fieldsDisabled || !audioDupSupported"
          />
        </template>
      </MirrorSettingRow>

      <MirrorSettingRow
        label="音频源"
        help="对应 --audio-source；output 为设备输出，playback 需 Android 13+ 且通常配合 audio-dup。"
      >
        <MirrorSearchableSelect
          v-model:value="audio.source"
          :options="sourceOptions"
          :disabled="fieldsDisabled"
        />
      </MirrorSettingRow>

      <MirrorSettingRow label="音频编码" :help="audioCodeHelp">
        <MirrorSearchableSelect
          v-model:value="audio.audioCode"
          :options="audioCodeSelectOptions"
          :disabled="fieldsDisabled || !audioCodeSelectOptions.length"
        />
      </MirrorSettingRow>

      <MirrorSettingRow label="比特率" help="音频编码目标比特率（kbps），影响音质与带宽。">
        <MirrorSearchableSelect
          v-model:value="audio.bitRateKbps"
          :options="bitRateOptions"
          :disabled="fieldsDisabled"
        />
      </MirrorSettingRow>

      <MirrorSettingRow
        label="缓冲 (ms)"
        help="对应桌面 scrcpy --audio-buffer；Web 投屏当前忽略，仅保留配置项。"
      >
        <NInputNumber
          v-model:value="audio.bufferMs"
          :min="0"
          :max="5000"
          :step="10"
          :disabled="fieldsDisabled"
          style="width: 100%"
        />
      </MirrorSettingRow>

      <MirrorSettingRow
        label="输出缓冲 (ms)"
        help="对应 --audio-output-buffer；Web 投屏当前忽略。"
      >
        <NInputNumber
          v-model:value="audio.outputBufferMs"
          :min="0"
          :max="5000"
          :step="10"
          :disabled="fieldsDisabled"
          style="width: 100%"
        />
      </MirrorSettingRow>
    </NForm>
  </NCollapseItem>
</template>
