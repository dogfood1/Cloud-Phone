import { nextTick, onBeforeUnmount, ref, shallowRef, unref, watch } from "vue";

import { stopDeviceCast, getDeviceCastStatus } from "../utils/cast-api.js";
import { createCastStartupLog } from "../utils/cast-startup-log.js";
import { buildCastWebSocketUrl } from "../utils/scrcpy-cast-helpers.js";
import { applyStagePreviewRotation } from "../utils/canvas-rotation.js";
import { HarmonyJpegPlayer } from "../utils/harmony-jpeg-player.js";
import { attachHarmonyCastInteraction } from "../utils/harmony-cast-interaction.js";

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function openIosCastWebSocket(serial) {
  const url = buildCastWebSocketUrl(serial);
  let lastError = new Error("iOS 投屏 WebSocket 连接失败。");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const ws = await new Promise((resolve, reject) => {
        let socket;

        try {
          socket = new WebSocket(url);
        } catch (error) {
          reject(error);
          return;
        }

        socket.binaryType = "arraybuffer";
        let settled = false;
        const timer = window.setTimeout(() => {
          socket.close();
          if (!settled) {
            settled = true;
            reject(new Error("iOS 投屏 WebSocket 连接超时。"));
          }
        }, 15_000);

        socket.onopen = () => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);
          resolve(socket);
        };

        socket.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error("iOS 投屏 WebSocket 连接失败。"));
          }
        };
      });

      return ws;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;

      if (attempt < 3) {
        await delay(400 * attempt);
      }
    }
  }

  throw lastError;
}

async function resolveCastCanvas(canvasRef, viewportRef) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick();
    const canvas = unref(canvasRef) ?? unref(viewportRef)?.querySelector?.("canvas");

    if (canvas) {
      return canvas;
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return null;
}

export function useIosCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef, castHooks = {}) {
  const isCastActive = castHooks.isCastActive ?? (() => true);
  const getInteractionEnabled = castHooks.getInteractionEnabled ?? (() => true);
  const getDevice = castHooks.getDevice ?? (() => null);
  const status = ref("idle");
  const errorMessage = ref("");
  const startupLogText = ref("等待连接日志…");
  const showStartupLogs = ref(false);
  const screenSize = ref({ width: 0, height: 0 });
  const sessionMeta = ref(null);
  const player = shallowRef(null);
  let socket = null;
  let stopRequest = null;
  let unbindInteraction = null;
  let deviceDisplaySize = null;
  let logPollTimer = null;
  let logPollConsumed = 0;
  let backendSessionActive = false;
  const startupLog = createCastStartupLog();

  function syncStartupLogText() {
    startupLogText.value = startupLog.textValue();
  }

  function appendStartupLog(message) {
    startupLog.append(message);
    syncStartupLogText();
  }

  function ingestStartupLogs(entries) {
    const before = startupLog.lines.length;
    startupLog.ingest(entries);
    if (startupLog.lines.length !== before) {
      syncStartupLogText();
    }
  }

  function stopLogPolling() {
    if (logPollTimer) {
      clearInterval(logPollTimer);
      logPollTimer = null;
    }
    logPollConsumed = 0;
  }

  function startLogPolling(serial) {
    stopLogPolling();
    logPollTimer = window.setInterval(async () => {
      try {
        const payload = await getDeviceCastStatus(serial);
        const entries = payload?.startupLogs;
        if (!Array.isArray(entries) || entries.length <= logPollConsumed) {
          return;
        }
        ingestStartupLogs(entries.slice(logPollConsumed));
        logPollConsumed = entries.length;
      } catch {
        // ignore
      }
    }, 600);
  }

  function sendIosMessage(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  function getDeviceDisplaySize() {
    const live = getDevice()?.displaySize;
    if (live?.width > 0 && live?.height > 0) {
      return { width: live.width, height: live.height };
    }

    if (deviceDisplaySize?.width > 0 && deviceDisplaySize?.height > 0) {
      return deviceDisplaySize;
    }

    const canvas = canvasRef?.value ?? null;
    if (canvas?.width > 0 && canvas?.height > 0) {
      return { width: canvas.width, height: canvas.height };
    }

    return null;
  }

  function bindInteraction(canvas) {
    if (unbindInteraction) {
      unbindInteraction();
      unbindInteraction = null;
    }

    unbindInteraction = attachHarmonyCastInteraction({
      canvas,
      sendMessage: sendIosMessage,
      getRotator: () => rotatorRef?.value ?? null,
      getDeviceDisplaySize,
      interactionEnabled: getInteractionEnabled(),
    });
  }

  function sendNavigation(actionId) {
    sendIosMessage({ type: "navigation", actionId });
  }

  function sendNavigationPress(actionId, phase) {
    if (phase === "down") {
      return;
    }

    sendNavigation(actionId);
  }

  async function stopCast(options = {}) {
    const serial = unref(serialRef);
    const shouldStopBackend = options.backend ?? backendSessionActive;

    if (stopRequest) {
      stopRequest.abort();
      stopRequest = null;
    }

    stopLogPolling();
    if (unbindInteraction) {
      unbindInteraction();
      unbindInteraction = null;
    }

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }

      socket = null;
    }

    status.value = "idle";
    errorMessage.value = "";
    showStartupLogs.value = false;
    backendSessionActive = false;

    if (!serial || !shouldStopBackend || !isCastActive()) {
      return;
    }

    const controller = new AbortController();
    stopRequest = controller;

    try {
      await stopDeviceCast(serial, { signal: controller.signal });
    } catch {
      // ignore
    } finally {
      stopRequest = null;
    }
  }

  async function beginCast(payload) {
    const serial = unref(serialRef);

    if (!serial || !payload?.success) {
      throw new Error("投屏会话无效。");
    }

    errorMessage.value = "";
    status.value = "starting";
    screenSize.value = { width: 0, height: 0 };
    startupLog.reset();
    syncStartupLogText();
    showStartupLogs.value = true;
    backendSessionActive = true;
    sessionMeta.value = payload;
    appendStartupLog("iOS 投屏：准备连接…");
    ingestStartupLogs(payload?.startupLogs ?? []);
    logPollConsumed = Array.isArray(payload?.startupLogs) ? payload.startupLogs.length : 0;
    startLogPolling(serial);

    const displaySize = payload?.displaySize ?? getDevice()?.displaySize;
    if (displaySize?.width && displaySize?.height) {
      deviceDisplaySize = { width: displaySize.width, height: displaySize.height };
      appendStartupLog(`iOS 投屏：设备分辨率 ${displaySize.width} × ${displaySize.height}`);
    }

    const canvas = await resolveCastCanvas(canvasRef, viewportRef);

    if (!canvas) {
      throw new Error("投屏画布未就绪。");
    }

    try {
      const nextPlayer = new HarmonyJpegPlayer(canvas);
      player.value = nextPlayer;
      socket = await openIosCastWebSocket(serial);
      appendStartupLog("iOS 投屏：WebSocket 已连接，等待首帧…");

      socket.onclose = () => {
        if (status.value === "streaming" || status.value === "starting") {
          status.value = "error";
          errorMessage.value = "iOS 投屏连接已断开。";
        }
      };

      socket.onmessage = async (event) => {
        if (!(event.data instanceof ArrayBuffer)) {
          return;
        }

        try {
          await nextPlayer.pushFrame(event.data);
          screenSize.value = { width: nextPlayer.width, height: nextPlayer.height };

          if (status.value !== "streaming") {
            status.value = "streaming";
            showStartupLogs.value = false;
            appendStartupLog("iOS 投屏：首帧已渲染。");
          }
        } catch (error) {
          status.value = "error";
          errorMessage.value = error instanceof Error ? error.message : "JPEG decode failed.";
        }
      };

      applyStagePreviewRotation(
        rotatorRef?.value ?? null,
        unref(castOptionsRef)?.mirror?.video?.rotationDeg ?? 0,
        viewportRef?.value ?? null,
      );
      bindInteraction(canvas);
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "iOS cast failed.";
      appendStartupLog(`iOS 投屏失败：${errorMessage.value}`);
      throw error;
    }
  }

  onBeforeUnmount(() => {
    if (isCastActive()) {
      void stopCast();
    }
  });

  watch(
    () => unref(serialRef),
    (next, previous) => {
      if (!isCastActive() || !previous || next === previous) {
        return;
      }

      void stopCast({ backend: backendSessionActive });
    },
  );

  return {
    status,
    errorMessage,
    startupLogText,
    showStartupLogs,
    beginCast,
    stopCast,
    sendNavigation,
    sendNavigationPress,
    sendControl: () => {},
    getEffectiveScreenSize: () => ({
      width: screenSize.value.width || player.value?.width || 0,
      height: screenSize.value.height || player.value?.height || 0,
    }),
    displayScreenOn: ref(true),
    applyPreviewRotation: (degrees) => {
      applyStagePreviewRotation(rotatorRef?.value ?? null, degrees, viewportRef?.value ?? null);
    },
    isRecording: ref(false),
    recordingElapsedMs: ref(0),
    isCastRecordingSupported: () => false,
    castVideoRecordingSupported: false,
    castAudioRecordingSupported: false,
    startCastRecording: async () => {},
    stopCastRecording: async () => {},
    toggleCastRecording: async () => {},
    resumeCastAudio: async () => {},
    sendCameraControl: async () => {},
    pasteClipboardToDevice: async () => {},
    copyClipboardFromDevice: async () => {},
  };
}
