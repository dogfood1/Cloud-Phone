import {
  downloadRecordingBlob,
  formatRecordingDuration,
  pickMediaRecorderMimeType,
} from "./cast-recording-utils.js";

const VIDEO_MP4_MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  'video/mp4;codecs="avc1.64003E,mp4a.40.2"',
  "video/mp4;codecs=avc1.64003E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
];

export { formatRecordingDuration, downloadRecordingBlob };

export function isCastVideoRecordingSupported() {
  if (typeof HTMLCanvasElement === "undefined" || typeof MediaRecorder === "undefined") {
    return false;
  }

  const probe = document.createElement("canvas");

  return (
    typeof probe.captureStream === "function" && pickMediaRecorderMimeType(VIDEO_MP4_MIME_CANDIDATES) !== ""
  );
}

function pickVideoMp4MimeType() {
  const mimeType = pickMediaRecorderMimeType(VIDEO_MP4_MIME_CANDIDATES);

  if (!mimeType) {
    throw new Error("当前浏览器不支持 MP4 录屏，请使用 Chrome 或 Edge。");
  }

  return mimeType;
}

export class CastVideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.startedAt = 0;
    this.timerId = null;
    this.onElapsed = null;
    this.recordingName = "";
  }

  get isActive() {
    return this.mediaRecorder?.state === "recording";
  }

  start(canvas, { fps = 30, displayName = "recording", onElapsed } = {}) {
    if (!canvas || this.isActive) {
      return false;
    }

    if (!isCastVideoRecordingSupported()) {
      throw new Error("当前浏览器不支持 MP4 录屏。");
    }

    this.recordingName = displayName;
    this.stream = canvas.captureStream(fps);
    const mimeType = pickVideoMp4MimeType();
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        this.chunks.push(event.data);
      }
    };
    this.mediaRecorder.start(1000);
    this.startedAt = Date.now();
    this.onElapsed = onElapsed;
    this.timerId = window.setInterval(() => {
      this.onElapsed?.(Date.now() - this.startedAt);
    }, 200);
    return true;
  }

  stop() {
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.onElapsed = null;

    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      this.#releaseStream();
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;

      recorder.onstop = () => {
        const mime = recorder.mimeType || "video/mp4";
        const blob =
          this.chunks.length > 0 ? new Blob(this.chunks, { type: mime }) : null;
        this.mediaRecorder = null;
        this.chunks = [];
        this.#releaseStream();
        resolve(blob);
      };

      recorder.onerror = () => {
        this.mediaRecorder = null;
        this.chunks = [];
        this.#releaseStream();
        reject(new Error("MP4 录屏编码失败"));
      };

      try {
        recorder.stop();
      } catch (error) {
        this.mediaRecorder = null;
        this.chunks = [];
        this.#releaseStream();
        reject(error instanceof Error ? error : new Error("停止录屏失败"));
      }
    });
  }

  #releaseStream() {
    if (!this.stream) {
      return;
    }

    for (const track of this.stream.getTracks()) {
      track.stop();
    }

    this.stream = null;
  }
}
