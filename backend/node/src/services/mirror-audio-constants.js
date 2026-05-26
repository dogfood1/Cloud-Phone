/** escrcpy preference/audio + scrcpy 4.0 --audio-source */

export const MIRROR_AUDIO_SOURCES = [
  { value: "output", label: "设备输出（默认）" },
  { value: "playback", label: "播放捕获" },
  { value: "mic", label: "麦克风" },
  { value: "mic-unprocessed", label: "麦克风（未处理）" },
  { value: "mic-camcorder", label: "麦克风（摄像机）" },
  { value: "mic-voice-recognition", label: "语音识别" },
  { value: "mic-voice-communication", label: "语音通话" },
  { value: "voice-call", label: "通话" },
  { value: "voice-call-uplink", label: "通话上行" },
  { value: "voice-call-downlink", label: "通话下行" },
  { value: "voice-performance", label: "语音性能" },
];
