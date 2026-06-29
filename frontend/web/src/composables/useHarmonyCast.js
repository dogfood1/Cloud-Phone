import { nextTick, onBeforeUnmount, ref, shallowRef, unref, watch } from "vue";

import { stopDeviceCast, getDeviceCastStatus } from "../utils/cast-api.js";
import { createCastStartupLog } from "../utils/cast-startup-log.js";
import { buildCastWebSocketUrl } from "../utils/scrcpy-cast-helpers.js";
import { applyStagePreviewRotation } from "../utils/canvas-rotation.js";
import { HarmonyJpegPlayer } from "../utils/harmony-jpeg-player.js";
import { attachHarmonyCastInteraction } from "../utils/harmony-cast-interaction.js";
import { resolveHarmonyNativeDisplaySize } from "../utils/harmony-cast-options.js";

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function openHarmonyCastWebSocketOnce(serial) {
  const url = buildCastWebSocketUrl(serial);

  return new Promise((resolve, reject) => {
    let ws;

    try {
      ws = new WebSocket(url);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    ws.binaryType = "arraybuffer";
    let settled = false;

    const finish = (handler) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      handler();
    };

    const timer = window.setTimeout(() => {
      ws.close();
      finish(() => reject(new Error("鸿蒙投屏 WebSocket 连接超时。")));
    }, 15_000);

    ws.onopen = () => {
      ws.onerror = null;
      ws.onclose = null;
      finish(() => resolve(ws));
    };

    ws.onerror = () => {
      finish(() => reject(new Error("鸿蒙投屏 WebSocket 连接失败。")));
    };

    ws.onclose = (event) => {
      if (settled) {
        return;
      }

      if (event.code === 1008 || event.code === 1002) {
        finish(() => reject(new Error("鸿蒙投屏 WebSocket 被拒绝，请先登录后再试。")));
        return;
      }

      finish(() => reject(new Error("鸿蒙投屏 WebSocket 连接已关闭。")));
    };
  });
}

async function openHarmonyCastWebSocket(serial) {
  let lastError = new Error("鸿蒙投屏 WebSocket 连接失败。");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await openHarmonyCastWebSocketOnce(serial);
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;

      if (attempt < 3) {
        await delay(400 * attempt);
      }
    }
  }

  throw new Error(
    `${lastError.message} 请从当前页面地址（${window.location.origin}）访问并保持登录；Docker 部署需 v0.13.9+ 前端镜像（含 WebSocket 代理）。`,
  );
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

export function useHarmonyCast(serialRef, canvasRef, castOptionsRef, rotatorRef, viewportRef, castHooks = {}) {
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
  /** @type {{ width: number, height: number } | null} */
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

  function hideStartupLogs() {
    showStartupLogs.value = false;
  }

  function sendHarmonyMessage(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  function sendControl(buffer) {
    void buffer;
  }

  function applyPreviewRotation(degrees) {
    applyStagePreviewRotation(
      rotatorRef?.value ?? null,
      degrees,
      viewportRef?.value ?? null,
    );

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }
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
    const scale = Number(sessionMeta.value?.castOptions?.scale ?? sessionMeta.value?.video?.scale) || 1;

    if (canvas?.width > 0 && canvas?.height > 0 && scale > 0) {
      return {
        width: Math.round(canvas.width / scale),
        height: Math.round(canvas.height / scale),
      };
    }

    return null;
  }

  function bindHarmonyInteraction(canvas) {
    teardownInteraction();
    unbindInteraction = attachHarmonyCastInteraction({
      canvas,
      sendMessage: sendHarmonyMessage,
      getRotator: () => rotatorRef?.value ?? null,
      getDeviceDisplaySize,
      interactionEnabled: getInteractionEnabled(),
    });
  }

  function sendNavigation() {}

  function getEffectiveScreenSize() {
    return {
      width: screenSize.value.width || player.value?.width || 0,
      height: screenSize.value.height || player.value?.height || 0,
    };
  }

  function teardownSocket() {
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
  }

  function teardownInteraction() {
    if (unbindInteraction) {
      unbindInteraction();
      unbindInteraction = null;
    }
  }

  async function stopCast(options = {}) {
    const serial = unref(serialRef);
    const shouldStopBackend = options.backend ?? backendSessionActive;

    if (stopRequest) {
      stopRequest.abort();
      stopRequest = null;
    }

    stopLogPolling();
    teardownInteraction();
    teardownSocket();
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

    if (!serial) {
      throw new Error("设备序列号无效，无法开始投屏。");
    }

    if (!payload?.success) {
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
    appendStartupLog("鸿蒙投屏：准备连接…");
    ingestStartupLogs(payload?.startupLogs ?? []);
    logPollConsumed = Array.isArray(payload?.startupLogs) ? payload.startupLogs.length : 0;
    startLogPolling(serial);
    deviceDisplaySize = resolveHarmonyNativeDisplaySize(getDevice() ?? {}, payload);
    if (deviceDisplaySize) {
      appendStartupLog(`鸿蒙投屏：设备分辨率 ${deviceDisplaySize.width} × ${deviceDisplaySize.height}`);
    }
    appendStartupLog("鸿蒙投屏：cast/start 完成，连接 WebSocket…");

    const canvas = await resolveCastCanvas(canvasRef, viewportRef);

    if (!canvas) {
      throw new Error("投屏画布未就绪。");
    }

    try {
      const nextPlayer = new HarmonyJpegPlayer(canvas);
      player.value = nextPlayer;
      socket = await openHarmonyCastWebSocket(serial);
      appendStartupLog("鸿蒙投屏：WebSocket 已连接，等待首帧…");

      socket.onclose = () => {
        if (status.value === "streaming" || status.value === "starting") {
          status.value = "error";
          errorMessage.value = "鸿蒙投屏连接已断开。";
        }
      };

      socket.onmessage = async (event) => {
        if (!(event.data instanceof ArrayBuffer)) {
          return;
        }

        try {
          await nextPlayer.pushFrame(event.data);
          screenSize.value = {
            width: nextPlayer.width,
            height: nextPlayer.height,
          };

          if (status.value !== "streaming") {
            status.value = "streaming";
            hideStartupLogs();
            appendStartupLog("鸿蒙投屏：首帧已渲染。");
          }
        } catch (error) {
          status.value = "error";
          errorMessage.value = error instanceof Error ? error.message : "JPEG decode failed.";
        }
      };

      teardownInteraction();
      applyPreviewRotation(unref(castOptionsRef)?.mirror?.video?.rotationDeg ?? 0);
      bindHarmonyInteraction(canvas);
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Harmony cast failed.";
      appendStartupLog(`鸿蒙投屏失败：${errorMessage.value}`);
      throw error;
    }
  }

  onBeforeUnmount(() => {
    if (isCastActive()) {
      void stopCast();
    }
  });

  watch(
    () => unref(castOptionsRef)?.mirror?.video?.rotationDeg,
    (degrees) => {
      applyPreviewRotation(degrees ?? 0);
    },
  );

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
    sendControl,
    getEffectiveScreenSize,
    displayScreenOn: ref(true),
    applyPreviewRotation,
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
    sendNavigationPress: async () => {},
  };
}
