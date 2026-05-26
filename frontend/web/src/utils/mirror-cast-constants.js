export const MIRROR_CAPTURE_ORIENTATIONS = [
  { value: "0", label: "0°" },
  { value: "90", label: "90°" },
  { value: "180", label: "180°" },
  { value: "270", label: "270°" },
  { value: "flip0", label: "0° 翻转" },
  { value: "flip90", label: "90° 翻转" },
  { value: "flip180", label: "180° 翻转" },
  { value: "flip270", label: "270° 翻转" },
];

export const MIRROR_RESOLUTIONS = [
  { value: "original", label: "原画（设备原生）", maxSize: 0 },
  { value: "1080p", label: "1080p（长边 1920）", maxSize: 1920 },
  { value: "720p", label: "720p（长边 1280）", maxSize: 1280 },
  { value: "540p", label: "540p（长边 960）", maxSize: 960 },
];

export const FALLBACK_AUDIO_SOURCES = [
  { value: "output", label: "设备输出（默认）" },
  { value: "mic", label: "麦克风" },
  { value: "playback", label: "播放捕获" },
];

export const FALLBACK_VIDEO_ENCODERS = [];

export const FALLBACK_AUDIO_ENCODERS = [{ value: "", label: "默认（自动）" }];

export function suggestDpi(width, height) {
  const w = Number(width) || 1920;
  const h = Number(height) || 1080;
  const diagonal = Math.hypot(w, h);
  const reference = Math.hypot(1920, 1080);
  return Math.max(120, Math.min(640, Math.round((diagonal / reference) * 420)));
}
