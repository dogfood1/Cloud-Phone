import { nextTick, onBeforeUnmount, ref, shallowRef, unref, watch } from "vue";

import { WsScrcpyAnnexBPlayer } from "../utils/ws-scrcpy-annexb-player.js";
import { isScrcpyAudioPacket, WsScrcpyAudioCanvas } from "../utils/ws-scrcpy-audio-canvas.js";
import { WsScrcpyAudioPlayback } from "../utils/ws-scrcpy-audio-playback.js";
import { isNewDisplayEnabled, resolveStartAppPackage } from "../utils/mirror-screen-utils.js";
import {
  MOTION_ACTION,
  serializeInjectScroll,
  serializeInjectTouch,
  KEY_ACTION,
  serializeDisplayWakeActions,
  serializeNavigationActions,
  serializeNavigationPress,
  serializeResetVideo,
  serializeStartApp,
} from "../utils/ws-scrcpy-control.js";
import { serializeChangeStreamParameters, videoSettingsFromCastOptions } from "../utils/ws-scrcpy-video-settings.js";
import {
  applyStagePreviewRotation,
  mapTouchToDevicePoint,
} from "../utils/canvas-rotation.js";

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

function parseInitialInfoScreenSize(bytes) {
  // ws-scrcpy initial info layout:
  // magic(13) + deviceName(64) + displaysCount(4) + DisplayInfo(24) ...
  const magicSize = MAGIC_INITIAL.length;
  const base = magicSize + 64 + 4;
  if (bytes.length < base + 24) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getInt32(base + 4, false);
  const height = view.getInt32(base + 8, false);

  if (!width || !height) {
    return null;
  }

  return { width, height };
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
    unbindCanvas = bindCanvas(canvasRef.value);
    applyPreviewRotation(unref(castOptionsRef)?.mirror?.video?.rotationDeg ?? 0);
    status.value = "streaming";
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

  function handleWsScrcpyBinary(nextPlayer, data) {
    const bytes = new Uint8Array(data);

    if (startsWithMagic(bytes, MAGIC_INITIAL)) {
      const size = parseInitialInfoScreenSize(bytes);
      if (size) {
        screenSize.value = size;
      }
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

      audioPlayback?.destroy();
      audioPlayback =
        !audioOnly && isCastAudioEnabled(castOptions) && WsScrcpyAudioPlayback.isSupported()
          ? new WsScrcpyAudioPlayback()
          : null;

      socket = new WebSocket(buildCastWebSocketUrl(serial));
      socket.binaryType = "arraybuffer";

      let settled = false;

      socket.addEventListener("open", () => {
        const castOptions = unref(castOptionsRef) ?? {};
        sendControl(
          serializeChangeStreamParameters(
            videoSettingsFromCastOptions(castOptions, sessionMeta.value),
          ),
        );
        queueStartAppAfterConnect(1200);
        if (!settled) {
          settled = true;
          resolve();
        }
      });

      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          return;
        }

        if (!settled) {
          settled = true;
          resolve();
        }

        handleWsScrcpyBinary(nextPlayer, event.data);
      });

      socket.addEventListener("error", () => {
        if (!settled) {
          settled = true;
          reject(new Error("投屏 WebSocket 连接失败"));
        }
      });

      socket.addEventListener("close", () => {
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

  function bindCanvas(canvas) {
    if (!canvas) {
      return () => {};
    }

    const mapPoint = (event) => {
      const size =
        screenSize.value.width > 0
          ? screenSize.value
          : { width: 1080, height: 1920 };
      const rotationDeg = unref(castOptionsRef)?.mirror?.video?.rotationDeg ?? 0;
      return mapTouchToDevicePoint(event, canvas, size, rotationDeg);
    };

    const onPointerDown = (event) => {
      canvas.setPointerCapture(event.pointerId);
      sendControl(
        serializeInjectTouch({
          action: MOTION_ACTION.DOWN,
          point: mapPoint(event),
          screenSize: screenSize.value,
        }),
      );
    };

    const onPointerMove = (event) => {
      if ((event.buttons & 1) === 0 || !screenSize.value.width) {
        return;
      }
      sendControl(
        serializeInjectTouch({
          action: MOTION_ACTION.MOVE,
          point: mapPoint(event),
          screenSize: screenSize.value,
        }),
      );
    };

    const onPointerUp = (event) => {
      if (!screenSize.value.width) {
        return;
      }
      sendControl(
        serializeInjectTouch({
          action: MOTION_ACTION.UP,
          point: mapPoint(event),
          screenSize: screenSize.value,
        }),
      );
    };

    const onWheel = (event) => {
      event.preventDefault();
      if (!screenSize.value.width) {
        return;
      }
      sendControl(
        serializeInjectScroll({
          point: mapPoint(event),
          screenSize: screenSize.value,
          hscroll: event.deltaX > 0 ? 1 : event.deltaX < 0 ? -1 : 0,
          vscroll: event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0,
        }),
      );
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }

  async function stopCast(options = {}) {
    const serial = serialRef.value;
    const shouldStopBackend = options.backend ?? backendSessionActive;

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
  };
}
