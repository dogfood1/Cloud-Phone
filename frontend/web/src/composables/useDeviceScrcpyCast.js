import { nextTick, onBeforeUnmount, ref, shallowRef, unref, watch } from "vue";

import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";
import { isScrcpyAudioPacket, WsScrcpyAudioCanvas } from "../utils/ws-scrcpy-audio-canvas.js";
import { WsScrcpyAudioPlayback } from "../utils/ws-scrcpy-audio-playback.js";
import { isNewDisplayEnabled, resolveStartAppPackage } from "../utils/mirror-screen-utils.js";
import {
  KEY_ACTION,
  serializeDisplayWakeActions,
  serializeNavigationActions,
  serializeNavigationPress,
  serializeResetVideo,
  serializeStartApp,
} from "../utils/ws-scrcpy-control.js";
import { serializeChangeStreamParameters, videoSettingsFromCastOptions } from "../utils/ws-scrcpy-video-settings.js";
import { applyStagePreviewRotation } from "../utils/canvas-rotation.js";
import { attachCastInteraction } from "../utils/scrcpy-cast-interaction.js";
import { CastAudioMp3Recorder, isCastAudioRecordingSupported } from "../utils/cast-audio-mp3-recorder.js";
import { downloadRecordingBlob } from "../utils/cast-recording-utils.js";
import { CastVideoRecorder, isCastVideoRecordingSupported } from "../utils/cast-video-recorder.js";

function isAudioOnlyCast(castOptions) {
  return castOptions?.mirror?.video?.disabled === true;
}

function isCastAudioEnabled(castOptions) {
  if (isAudioOnlyCast(castOptions)) {
    return true;
  }

  return castOptions?.audio === true;
}

function buildCastWebSocketUrl(serial) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/devices/${encodeURIComponent(serial)}/cast/ws`;
}

const MAGIC_INITIAL = new TextEncoder().encode("scrcpy_initial");
const MAGIC_MESSAGE = new TextEncoder().encode("scrcpy_message");

function startsWithMagic(bytes, magic) {
  if (bytes.length < magic.length) {
    return false;
  }

  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) {
      return false;
    }
  }

  return true;
}

export function useDeviceScrcpyCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef) {
  const status = ref("idle");
  const errorMessage = ref("");
  const player = shallowRef(null);
  const screenSize = ref({ width: 0, height: 0 });
  const sessionMeta = ref(null);
  let socket = null;
  let stopRequest = null;
  let unbindCanvas = null;
  let audioPlayback = null;
  /** True after POST /cast/start succeeded (backend has a session). */
  let backendSessionActive = false;
  let startAppTimer = null;
  let startAppSent = false;
  const displayScreenOn = ref(true);
  const isRecording = ref(false);
  const recordingElapsedMs = ref(0);
  const castVideoRecordingSupported = isCastVideoRecordingSupported();
  const castAudioRecordingSupported = isCastAudioRecordingSupported();
  const videoRecorder = new CastVideoRecorder();
  const audioRecorder = new CastAudioMp3Recorder();
  let recordingDisplayName = "";
  /** @type {"video" | "audio" | null} */
  let recordingMode = null;

  function isAudioOnlyRecording() {
    return isAudioOnlyCast(unref(castOptionsRef));
  }

  function resolveCastAudioCapture() {
    const currentPlayer = player.value;

    if (typeof currentPlayer?.beginPcmRecording === "function") {
      return currentPlayer;
    }

    if (currentPlayer?.playback) {
      return currentPlayer.playback;
    }

    return audioPlayback;
  }

  function isCastRecordingSupported(castOptions = unref(castOptionsRef)) {
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

  async function beginCast(payload) {
    const serial = serialRef.value;

    if (!serial) {
      throw new Error("设备序列号无效，无法开始投屏。");
    }

    if (!payload?.success) {
      throw new Error("投屏会话无效。");
    }

    errorMessage.value = "";
    status.value = "starting";

    const audioOnly = isAudioOnlyCast(unref(castOptionsRef));

    if (audioOnly) {
      if (!WsScrcpyAudioCanvas.isSupported()) {
        status.value = "error";
        errorMessage.value = "当前浏览器不支持 Web Audio，无法使用仅音频模式。";
        throw new Error(errorMessage.value);
      }
    } else if (!WsScrcpyAnnexBPlayer.isSupported()) {
      status.value = "error";
      errorMessage.value = "当前浏览器不支持 WebCodecs H.264 解码（请使用 Chrome / Edge）。";
      throw new Error(errorMessage.value);
    }

    sessionMeta.value = payload;
    backendSessionActive = true;

    await nextTick();
    await openWebSocket(serial);
    unbindCanvas?.();
    unbindCanvas = attachCastInteraction({
      canvas: canvasRef.value,
      getScreenSize: getEffectiveScreenSize,
      getRotator: () => rotatorRef?.value ?? null,
      hasScreenInfo: () => screenSize.value.width > 0,
      sendControl,
    });
    applyPreviewRotation(unref(castOptionsRef)?.mirror?.video?.rotationDeg ?? 0);
    status.value = "streaming";

    if (audioOnly && typeof player.value?.resumeForUserPlayback === "function") {
      void player.value.resumeForUserPlayback();
    }
  }

  /** @deprecated Prefer workspace calling cast-api then beginCast(payload). */
  async function startCast() {
    const serial = serialRef.value;

    if (!serial) {
      throw new Error("设备序列号无效，无法开始投屏。");
    }

    try {
      const options = unref(castOptionsRef) ?? { maxSize: 1024 };
      const response = await fetch(`/api/devices/${encodeURIComponent(serial)}/cast/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(options),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? payload.error ?? "投屏启动失败");
      }

      await beginCast(payload);
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "投屏启动失败";
      await stopCast({ backend: backendSessionActive });
      throw error;
    }
  }

  async function resumeCastAudio() {
    const currentPlayer = player.value;

    if (typeof currentPlayer?.resumeForUserPlayback === "function") {
      await currentPlayer.resumeForUserPlayback();
      return;
    }

    await audioPlayback?.resumeForUserPlayback?.();
  }

  function handleWsScrcpyBinary(nextPlayer, data) {
    const bytes = new Uint8Array(data);

    if (startsWithMagic(bytes, MAGIC_INITIAL)) {
      // Physical display size from initial info — do not use for touch injection.
      // scrcpy PositionMapper expects the encoded video frame size (see onVideoFrameSize).
      queueStartAppAfterConnect(500);
      return;
    }

    if (startsWithMagic(bytes, MAGIC_MESSAGE)) {
      // clipboard / push responses etc — currently ignored by Cloud-Phone UI
      return;
    }

    if (isScrcpyAudioPacket(bytes)) {
      if (typeof nextPlayer.pushPcm === "function") {
        nextPlayer.pushPcm(bytes);
      } else {
        audioPlayback?.pushPcm(bytes);
      }
      return;
    }

    if (typeof nextPlayer.pushFrame === "function") {
      nextPlayer.pushFrame(bytes);
    }

    if (nextPlayer.lastError && status.value === "streaming") {
      status.value = "error";
      errorMessage.value = `H.264 解码失败：${nextPlayer.lastError}`;
    }
  }

  function applyControlVideoSize(size) {
    if (!size?.width || !size?.height) {
      return;
    }

    if (
      screenSize.value.width === size.width &&
      screenSize.value.height === size.height
    ) {
      return;
    }

    screenSize.value = { width: size.width, height: size.height };
  }

  function getEffectiveScreenSize() {
    if (screenSize.value.width > 0 && screenSize.value.height > 0) {
      return screenSize.value;
    }

    return { width: 0, height: 0 };
  }

  function openWebSocket(serial) {
    return new Promise((resolve, reject) => {
      closeWebSocket();

      const canvas = canvasRef.value;

      if (!canvas) {
        reject(new Error("投屏画布未就绪"));
        return;
      }

      const castOptions = unref(castOptionsRef) ?? {};
      const audioOnly = isAudioOnlyCast(castOptions);
      const nextPlayer = audioOnly ? new WsScrcpyAudioCanvas(canvas) : new WsScrcpyAnnexBPlayer(canvas);
      player.value = nextPlayer;

      if (!audioOnly && typeof nextPlayer.onVideoFrameSize !== "undefined") {
        nextPlayer.onVideoFrameSize = applyControlVideoSize;
      }

      audioPlayback?.destroy();
      audioPlayback =
        !audioOnly && isCastAudioEnabled(castOptions) && WsScrcpyAudioPlayback.isSupported()
          ? new WsScrcpyAudioPlayback()
          : null;

      socket = new WebSocket(buildCastWebSocketUrl(serial));
      socket.binaryType = "arraybuffer";

      let settled = false;

      const settleReady = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      const readyTimeout = setTimeout(() => {
        settleReady();
      }, 12_000);

      socket.addEventListener("open", () => {
        const castOptions = unref(castOptionsRef) ?? {};
        sendControl(
          serializeChangeStreamParameters(
            videoSettingsFromCastOptions(castOptions, sessionMeta.value),
          ),
        );
        queueStartAppAfterConnect(1200);
      });

      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          return;
        }

        handleWsScrcpyBinary(nextPlayer, event.data);

        if (!settled) {
          const bytes = new Uint8Array(event.data);

          if (audioOnly && isScrcpyAudioPacket(bytes)) {
            clearTimeout(readyTimeout);
            settleReady();
          } else if (screenSize.value.width > 0 && screenSize.value.height > 0) {
            clearTimeout(readyTimeout);
            settleReady();
          }
        }
      });

      socket.addEventListener("error", () => {
        clearTimeout(readyTimeout);

        if (!settled) {
          settled = true;
          reject(new Error("投屏 WebSocket 连接失败"));
        }
      });

      socket.addEventListener("close", () => {
        clearTimeout(readyTimeout);

        if (status.value === "streaming") {
          status.value = "error";
          errorMessage.value = "投屏连接已断开";
        }
      });
    });
  }

  function clearStartAppTimer() {
    if (startAppTimer) {
      clearTimeout(startAppTimer);
      startAppTimer = null;
    }
  }

  function queueStartAppAfterConnect(delayMs) {
    const screen = unref(castOptionsRef)?.mirror?.screen ?? {};
    const packageName = resolveStartAppPackage(screen);

    if (!packageName || startAppSent) {
      return;
    }

    const newDisplay = isNewDisplayEnabled(screen);
    const baseDelay = delayMs ?? (newDisplay ? 2800 : 900);

    const sendOnce = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const buffer = serializeStartApp(packageName);

      if (buffer) {
        sendControl(buffer);
      }
    };

    clearStartAppTimer();
    startAppTimer = setTimeout(() => {
      startAppTimer = null;
      startAppSent = true;
      sendOnce();

      if (newDisplay) {
        setTimeout(sendOnce, 2500);
      }
    }, baseDelay);
  }

  function closeWebSocket() {
    clearStartAppTimer();
    startAppSent = false;
    unbindCanvas?.();
    unbindCanvas = null;

    if (socket) {
      socket.close();
      socket = null;
    }

    player.value?.destroy();
    player.value = null;
    audioPlayback?.destroy();
    audioPlayback = null;
    sessionMeta.value = null;
    displayScreenOn.value = true;
  }

  function sendControl(buffer) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(buffer);
  }

  function pushVideoStreamSettings() {
    const castOptions = unref(castOptionsRef) ?? {};
    sendControl(
      serializeChangeStreamParameters(
        videoSettingsFromCastOptions(castOptions, sessionMeta.value),
      ),
    );
  }

  function applyPreviewRotation(degrees) {
    applyStagePreviewRotation(
      rotatorRef?.value ?? null,
      degrees,
      viewportRef?.value ?? null,
    );
  }

  async function stopCast(options = {}) {
    const serial = serialRef.value;
    const shouldStopBackend = options.backend ?? backendSessionActive;

    await stopCastRecording(true);
    closeWebSocket();
    status.value = "idle";
    errorMessage.value = "";
    sessionMeta.value = null;
    backendSessionActive = false;

    if (!serial || !shouldStopBackend) {
      return;
    }

    stopRequest?.abort();
    stopRequest = new AbortController();

    try {
      await fetch(`/api/devices/${encodeURIComponent(serial)}/cast/stop`, {
        method: "DELETE",
        signal: stopRequest.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    } finally {
      stopRequest = null;
    }
  }

  watch(
    () => unref(castOptionsRef)?.mirror?.video?.rotationDeg,
    (degrees) => {
      applyPreviewRotation(degrees ?? 0);
    },
  );

  watch(status, (next, prev) => {
    if (prev === "streaming" && next !== "streaming" && isRecording.value) {
      void stopCastRecording(true);
    }
  });

  onBeforeUnmount(() => {
    void stopCast();
  });

  return {
    status,
    errorMessage,
    screenSize,
    sessionMeta,
    beginCast,
    startCast,
    stopCast,
    sendNavigationPress: (actionId, phase) => {
      const keyAction = phase === "down" ? KEY_ACTION.DOWN : KEY_ACTION.UP;
      const buffer = serializeNavigationPress(actionId, keyAction);

      if (buffer) {
        sendControl(buffer);
      }
    },
    sendNavigation: (actionId) => {
      if (actionId === "screen-off" || actionId === "screen-on") {
        const turnOn = actionId === "screen-on";
        displayScreenOn.value = turnOn;

        if (turnOn) {
          for (const buffer of serializeDisplayWakeActions()) {
            sendControl(buffer);
          }
          window.setTimeout(() => {
            sendControl(serializeResetVideo());
          }, 450);
        } else {
          for (const buffer of serializeNavigationActions("screen-off")) {
            sendControl(buffer);
          }
        }

        return;
      }

      for (const buffer of serializeNavigationActions(actionId)) {
        sendControl(buffer);
      }
    },
    displayScreenOn,
    applyPreviewRotation,
    isRecording,
    recordingElapsedMs,
    castVideoRecordingSupported,
    castAudioRecordingSupported,
    isCastRecordingSupported,
    startCastRecording,
    stopCastRecording,
    toggleCastRecording,
    resumeCastAudio,
  };
}
