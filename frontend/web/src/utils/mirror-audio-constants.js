/** Aligned with escrcpy desktop/src/models/preference/audio/index.js + scrcpy doc/audio.md */

export const DEFAULT_AUDIO_CODEC = "opus";

export const AUDIO_BITRATE_PRESETS_KBPS = [
  { value: 64, label: "64 Kbps" },
  { value: 128, label: "128 Kbps（默认）" },
  { value: 192, label: "192 Kbps" },
  { value: 256, label: "256 Kbps" },
];

/** escrcpy `audioSource.options` order */
export const MIRROR_AUDIO_SOURCES = [
  { value: "output", label: "设备输出（默认，REMOTE_SUBMIX）" },
  { value: "playback", label: "播放捕获（playback）" },
  { value: "mic", label: "麦克风（mic）" },
  { value: "mic-unprocessed", label: "麦克风未处理（mic-unprocessed）" },
  { value: "mic-camcorder", label: "麦克风摄像机（mic-camcorder）" },
  { value: "mic-voice-recognition", label: "语音识别（mic-voice-recognition）" },
  { value: "mic-voice-communication", label: "语音通话麦克风（mic-voice-communication）" },
  { value: "voice-call", label: "通话（voice-call）" },
  { value: "voice-call-uplink", label: "通话上行（voice-call-uplink）" },
  { value: "voice-call-downlink", label: "通话下行（voice-call-downlink）" },
  { value: "voice-performance", label: "语音性能 / K 歌（voice-performance）" },
];

/** escrcpy static `audioCode.options` when device list unavailable */
export const FALLBACK_AUDIO_CODE_OPTIONS = [
  { value: "opus", label: "opus（默认编码）", codec: "opus", encoder: "" },
  { value: "aac", label: "aac（默认编码）", codec: "aac", encoder: "" },
  { value: "flac", label: "flac", codec: "flac", encoder: "" },
  { value: "raw", label: "raw（PCM 16-bit LE）", codec: "raw", encoder: "" },
  {
    value: "opus & c2.android.opus.encoder",
    label: "opus - c2.android.opus.encoder",
    codec: "opus",
    encoder: "c2.android.opus.encoder",
  },
  {
    value: "aac & c2.android.aac.encoder",
    label: "aac - c2.android.aac.encoder",
    codec: "aac",
    encoder: "c2.android.aac.encoder",
  },
  {
    value: "aac & OMX.google.aac.encoder",
    label: "aac - OMX.google.aac.encoder",
    codec: "aac",
    encoder: "OMX.google.aac.encoder",
  },
];
