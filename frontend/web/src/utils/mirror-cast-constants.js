import { MIRROR_AUDIO_SOURCES } from "./mirror-audio-constants.js";

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
  { value: "4k", label: "4K（长边 2160）", maxSize: 2160 },
  { value: "1440p", label: "1440p（长边 1440）", maxSize: 1440 },
  { value: "1080p", label: "1080p（长边 1920）", maxSize: 1920 },
  { value: "720p", label: "720p（长边 1280）", maxSize: 1280 },
  { value: "540p", label: "540p（长边 960）", maxSize: 960 },
];

export const NEW_DISPLAY_PRESETS = [
  { label: "FHD 1920×1080 / 160", value: "1920x1080/160", width: 1920, height: 1080, dpi: 160 },
  { label: "HD 1280×720 / 160", value: "1280x720/160", width: 1280, height: 720, dpi: 160 },
  { label: "QHD 2560×1440 / 160", value: "2560x1440/160", width: 2560, height: 1440, dpi: 160 },
  { label: "4K 3840×2160 / 160", value: "3840x2160/160", width: 3840, height: 2160, dpi: 160 },
  { label: "MacBook Pro 14\" 3024×1964 / 254", value: "3024x1964/254", width: 3024, height: 1964, dpi: 254 },
  { label: "iPhone 16 2556×1179 / 460", value: "2556x1179/460", width: 2556, height: 1179, dpi: 460 },
];

export const DISPLAY_IME_POLICIES = [
  { value: "", label: "默认" },
  { value: "local", label: "local（虚拟屏本地 IME）" },
  { value: "fallback", label: "fallback（回退主屏）" },
  { value: "hide", label: "hide（隐藏 IME）" },
];

export const FALLBACK_AUDIO_SOURCES = MIRROR_AUDIO_SOURCES;

export const FALLBACK_VIDEO_ENCODERS = [
  { codec: "h264", value: "c2.android.avc.encoder", label: "c2.android.avc.encoder" },
  { codec: "h264", value: "OMX.google.h264.encoder", label: "OMX.google.h264.encoder" },
];

export function suggestDpi(width, height) {
  const w = Number(width) || 1920;
  const h = Number(height) || 1080;
  const diagonal = Math.hypot(w, h);
  const reference = Math.hypot(1920, 1080);
  return Math.max(120, Math.min(640, Math.round((diagonal / reference) * 420)));
}
