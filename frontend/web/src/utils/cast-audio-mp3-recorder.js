import { encodeInterleavedPcmToMp3 } from "./encode-pcm-mp3.js";
import { formatRecordingDuration } from "./cast-recording-utils.js";

export { formatRecordingDuration };

export function isCastAudioRecordingSupported() {
  return typeof window !== "undefined" && typeof AudioContext !== "undefined";
}

export class CastAudioMp3Recorder {
  constructor() {
    this.capture = null;
    this.startedAt = 0;
    this.timerId = null;
    this.onElapsed = null;
    this.recordingName = "";
  }

  get isActive() {
    return Boolean(this.capture?.isPcmRecordingActive?.());
  }

  async start(capture, { displayName = "recording", onElapsed } = {}) {
    if (!capture || this.isActive) {
      return false;
    }

    if (!isCastAudioRecordingSupported()) {
      throw new Error("当前浏览器不支持音频录制。");
    }

    await capture.resumeForUserPlayback?.();
    capture.beginPcmRecording();
    this.capture = capture;
    this.recordingName = displayName;
    this.startedAt = Date.now();
    this.onElapsed = onElapsed;
    this.timerId = window.setInterval(() => {
      this.onElapsed?.(Date.now() - this.startedAt);
    }, 200);
    return true;
  }

  async stop() {
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.onElapsed = null;

    const capture = this.capture;
    this.capture = null;

    if (!capture) {
      return null;
    }

    const pcm = capture.endPcmRecording();

    if (!pcm?.length) {
      throw new Error(
        "未采集到音频数据。请确认仅音频投屏已连接、设备正在出声，并录制至少数秒。",
      );
    }

    const blob = encodeInterleavedPcmToMp3(pcm);

    if (!blob?.size) {
      throw new Error("MP3 编码失败，请重试。");
    }

    return blob;
  }
}
