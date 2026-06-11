import { onBeforeUnmount, ref, shallowRef, unref, watch } from "vue";

import { startDeviceCast, stopDeviceCast, getDeviceCastStatus } from "../utils/cast-api.js";
import { buildHarmonyCastOptions } from "../utils/harmony-cast-options.js";
import { createCastStartupLog } from "../utils/cast-startup-log.js";
import { buildCastWebSocketUrl } from "../utils/scrcpy-cast-helpers.js";
import { HarmonyJpegPlayer } from "../utils/harmony-jpeg-player.js";
import { attachHarmonyCastInteraction } from "../utils/harmony-cast-interaction.js";

export function useHarmonyCast(serialRef, canvasRef, castOptionsRef, viewportRef, castHooks = {}) {
  const getInteractionEnabled = castHooks.getInteractionEnabled ?? (() => true);
  const status = ref("idle");
  const errorMessage = ref("");
  const startupLogText = ref("等待连接日志…");
  const showStartupLogs = ref(false);
  const screenSize = ref({ width: 0, height: 0 });
  const player = shallowRef(null);
  let socket = null;
  let stopRequest = null;
  let unbindInteraction = null;
  let logPollTimer = null;
  let logPollConsumed = 0;
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

  async function stopCast() {
    const serial = unref(serialRef);
    stopLogPolling();
    teardownInteraction();
    teardownSocket();
    status.value = "idle";
    errorMessage.value = "";
    showStartupLogs.value = false;

    if (!serial) {
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

  async function beginCast() {
    const serial = unref(serialRef);
    const canvas = unref(canvasRef);

    if (!serial || !canvas) {
      return;
    }

    await stopCast();
    status.value = "starting";
    errorMessage.value = "";
    startupLog.reset();
    syncStartupLogText();
    showStartupLogs.value = true;
    appendStartupLog("鸿蒙投屏：准备连接…");
    startLogPolling(serial);

    try {
      const rawOptions = unref(castOptionsRef) ?? {};
      const options = buildHarmonyCastOptions({ serial }, rawOptions);
      const session = await startDeviceCast(serial, options);
      ingestStartupLogs(session?.startupLogs ?? []);
      appendStartupLog("鸿蒙投屏：cast/start 完成，连接 WebSocket…");

      const nextPlayer = new HarmonyJpegPlayer(canvas);
      player.value = nextPlayer;

      await new Promise((resolve, reject) => {
        const ws = new WebSocket(buildCastWebSocketUrl(serial));
        ws.binaryType = "arraybuffer";
        socket = ws;

        ws.onopen = () => {
          appendStartupLog("鸿蒙投屏：WebSocket 已连接，等待首帧…");
          resolve();
        };

        ws.onerror = () => {
          reject(new Error("Harmony cast WebSocket failed."));
        };

        ws.onclose = () => {
          if (status.value === "streaming" || status.value === "starting") {
            status.value = "error";
            errorMessage.value = "鸿蒙投屏连接已断开。";
          }
        };
      });

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
      unbindInteraction = attachHarmonyCastInteraction({
        canvas,
        sendMessage: sendHarmonyMessage,
        interactionEnabled: getInteractionEnabled(),
      });
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Harmony cast failed.";
      appendStartupLog(`鸿蒙投屏失败：${errorMessage.value}`);
      await stopCast();
    }
  }

  onBeforeUnmount(() => {
    void stopCast();
  });

  watch(serialRef, () => {
    void stopCast();
  });

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
    applyPreviewRotation: () => {},
    isRecording: ref(false),
    recordingElapsedMs: ref(0),
    castVideoRecordingSupported: ref(false),
    castAudioRecordingSupported: ref(false),
    isCastRecordingSupported: ref(false),
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
