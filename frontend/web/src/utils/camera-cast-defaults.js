export const CAMERA_FACING_OPTIONS = [
  { value: "", label: "自动（首个可用）" },
  { value: "back", label: "后置" },
  { value: "front", label: "前置" },
  { value: "external", label: "外接" },
];

export const CAMERA_AR_OPTIONS = [
  { value: "", label: "自动（最大尺寸）" },
  { value: "sensor", label: "传感器比例" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
];

export const CAMERA_MIN_SDK = 31;

export function createDefaultCameraSettings() {
  return {
    camera: {
      facing: "back",
      cameraId: "",
      size: "",
      aspectRatio: "",
      fps: 30,
      highSpeed: false,
      torch: false,
      zoom: 1,
      resolution: "1080p",
      bitRateMbps: 8,
      maxFps: 30,
      iFrameInterval: 10,
      encoder: "",
      codec: "h264",
    },
    audio: {
      disabled: false,
      source: "mic",
      codec: "opus",
      encoder: "",
      bitRateKbps: 128,
      audioDup: false,
    },
  };
}
