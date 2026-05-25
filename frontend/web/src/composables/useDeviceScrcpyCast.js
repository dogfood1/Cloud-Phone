import { onBeforeUnmount, ref, shallowRef } from "vue";

import { H264WebCodecsPlayer } from "../utils/h264-webcodecs-player.js";

function buildCastWebSocketUrl(serial) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/devices/${encodeURIComponent(serial)}/cast/ws`;
}

export function useDeviceScrcpyCast(serialRef, canvasRef) {
  const status = ref("idle");
  const errorMessage = ref("");
  const player = shallowRef(null);
  let socket = null;

  async function startCast() {
    const serial = serialRef.value;

    if (!serial) {
      return;
    }

    errorMessage.value = "";
    status.value = "starting";

    if (!H264WebCodecsPlayer.isSupported()) {
      status.value = "error";
      errorMessage.value = "当前浏览器不支持 WebCodecs H.264 解码。";
      return;
    }

    try {
      const response = await fetch(`/api/devices/${encodeURIComponent(serial)}/cast/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSize: 1024 }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? payload.error ?? "投屏启动失败");
      }

      await openWebSocket(serial);
      status.value = "streaming";
    } catch (error) {
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "投屏启动失败";
      await stopCast();
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

      const nextPlayer = new H264WebCodecsPlayer(canvas);
      player.value = nextPlayer;

      socket = new WebSocket(buildCastWebSocketUrl(serial));
      socket.binaryType = "arraybuffer";

      socket.addEventListener("open", () => resolve());
      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          return;
        }

        nextPlayer.append(event.data);
      });
      socket.addEventListener("error", () => {
        reject(new Error("投屏 WebSocket 连接失败"));
      });
      socket.addEventListener("close", () => {
        if (status.value === "streaming") {
          status.value = "error";
          errorMessage.value = "投屏连接已断开";
        }
      });
    });
  }

  function closeWebSocket() {
    if (socket) {
      socket.close();
      socket = null;
    }

    player.value?.destroy();
    player.value = null;
  }

  async function stopCast() {
    const serial = serialRef.value;

    closeWebSocket();
    status.value = "idle";
    errorMessage.value = "";

    if (!serial) {
      return;
    }

    try {
      await fetch(`/api/devices/${encodeURIComponent(serial)}/cast/stop`, {
        method: "DELETE",
      });
    } catch {
      // ignore cleanup errors
    }
  }

  onBeforeUnmount(() => {
    void stopCast();
  });

  return {
    status,
    errorMessage,
    startCast,
    stopCast,
  };
}
