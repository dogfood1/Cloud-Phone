export function createDefaultMirrorSettings() {
  return {
    video: {
      disabled: false,
      bitRateMbps: 5,
      encoder: "",
      rotationDeg: 0,
      captureOrientation: "0",
      maxFps: 60,
      iFrameInterval: 10,
      resolution: "1080p",
    },
    audio: {
      disabled: false,
      keepOnDevice: true,
      source: "output",
      bitRateKbps: 128,
      encoder: "",
    },
    device: {
      showTouches: false,
      stayAwake: false,
      turnScreenOff: false,
      powerOn: true,
    },
    screen: {
      displayId: "",
      useNewDisplay: false,
      newDisplayWidth: 1920,
      newDisplayHeight: 1080,
      newDisplayDpi: 420,
      newDisplayDpiManual: false,
      newDisplayApp: "",
    },
  };
}
