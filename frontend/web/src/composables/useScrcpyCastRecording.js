import { ref, unref } from "vue";

import { CastAudioMp3Recorder, isCastAudioRecordingSupported } from "../utils/cast-audio-mp3-recorder.js";
import { downloadRecordingBlob } from "../utils/cast-recording-utils.js";
import { CastVideoRecorder, isCastVideoRecordingSupported } from "../utils/cast-video-recorder.js";
import { isAudioOnlyCast } from "../utils/scrcpy-cast-helpers.js";

/**
 * @param {{
 *   castOptionsRef: import('vue').MaybeRefOrGetter<object | undefined>;
 *   canvasRef: import('vue').Ref<HTMLCanvasElement | null>;
 *   player: import('vue').ShallowRef<unknown>;
 *   getAudioPlayback: () => { pushPcm?: (bytes: Uint8Array) => void } | null;
 *   status: import('vue').Ref<string>;
 *   serialRef: import('vue').Ref<string>;
 * }} deps
 */
export function useScrcpyCastRecording(deps) {
  const { castOptionsRef, canvasRef, player, getAudioPlayback, status, serialRef } = deps;

  const isRecording = ref(false);
  const recordingElapsedMs = ref(0);
  const castVideoRecordingSupported = isCastVideoRecordingSupported();
  const castAudioRecordingSupported = isCastAudioRecordingSupported();
  const videoRecorder = new CastVideoRecorder();
  const audioRecorder = new CastAudioMp3Recorder();
  let recordingDisplayName = "";
  /** @type {"video" | "audio" | null} */
  let recordingMode = null;

  function resolveCastOptions() {
    return unref(castOptionsRef);
  }

  function isAudioOnlyRecording() {
    return isAudioOnlyCast(resolveCastOptions());
  }

  function resolveCastAudioCapture() {
    const currentPlayer = player.value;

    if (typeof currentPlayer?.beginPcmRecording === "function") {
      return currentPlayer;
    }

    if (currentPlayer?.playback) {
      return currentPlayer.playback;
    }

    return getAudioPlayback();
  }

  function isCastRecordingSupported(castOptions = resolveCastOptions()) {
    if (isAudioOnlyCast(castOptions)) {
      return castAudioRecordingSupported;
    }

    return castVideoRecordingSupported;
  }

  function assertCanRecord() {
    if (status.value !== "streaming") {
      throw new Error("请先开始投屏后再录屏。");
    }

    if (isAudioOnlyRecording()) {
      if (!castAudioRecordingSupported) {
        throw new Error("当前浏览器不支持音频录制。");
      }

      if (!resolveCastAudioCapture()) {
        throw new Error("设备音频通道未就绪。");
      }

      return;
    }

    if (!castVideoRecordingSupported) {
      throw new Error("当前浏览器不支持 MP4 录屏，请使用 Chrome 或 Edge。");
    }

    if (!canvasRef.value) {
      throw new Error("投屏画布未就绪。");
    }
  }

  async function startCastRecording(displayName) {
    assertCanRecord();
    recordingDisplayName = displayName || serialRef.value || "recording";

    let started = false;

    if (isAudioOnlyRecording()) {
      started = await audioRecorder.start(resolveCastAudioCapture(), {
        displayName: recordingDisplayName,
        onElapsed(ms) {
          recordingElapsedMs.value = ms;
        },
      });
      recordingMode = "audio";
    } else {
      started = videoRecorder.start(canvasRef.value, {
        displayName: recordingDisplayName,
        onElapsed(ms) {
          recordingElapsedMs.value = ms;
        },
      });
      recordingMode = "video";
    }

    if (!started) {
      recordingMode = null;
      throw new Error("录屏已在进行中。");
    }

    isRecording.value = true;
    recordingElapsedMs.value = 0;
  }

  async function stopCastRecording(save = true) {
    const activeMode =
      recordingMode ??
      (audioRecorder.isActive ? "audio" : videoRecorder.isActive ? "video" : null);
    const wasActive =
      isRecording.value || videoRecorder.isActive || audioRecorder.isActive;

    if (!wasActive) {
      return null;
    }

    isRecording.value = false;
    recordingMode = null;

    const blob =
      activeMode === "audio" ? await audioRecorder.stop() : await videoRecorder.stop();
    recordingElapsedMs.value = 0;

    if (save && blob?.size) {
      const extension = activeMode === "audio" ? "mp3" : "mp4";
      downloadRecordingBlob(
        blob,
        recordingDisplayName || serialRef.value || "recording",
        extension,
      );
    } else if (save && activeMode === "audio" && !blob?.size) {
      throw new Error("MP3 保存失败，未生成有效音频文件。");
    }

    return blob;
  }

  async function toggleCastRecording(displayName) {
    if (isRecording.value) {
      await stopCastRecording(true);
      return false;
    }

    await startCastRecording(displayName);
    return true;
  }

  return {
    isRecording,
    recordingElapsedMs,
    castVideoRecordingSupported,
    castAudioRecordingSupported,
    isCastRecordingSupported,
    startCastRecording,
    stopCastRecording,
    toggleCastRecording,
  };
}
