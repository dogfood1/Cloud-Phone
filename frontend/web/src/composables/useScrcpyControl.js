import { onBeforeUnmount, ref } from "vue";

import { MOTION_ACTION } from "../utils/scrcpy-control-constants.js";

function buildControlWebSocketUrl(serial) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/devices/${encodeURIComponent(serial)}/cast/control/ws`;
}

export function useScrcpyControl(serialRef, screenSizeRef) {
  const ready = ref(false);
  let socket = null;

  function send(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }

  function connect() {
    const serial = serialRef.value;

    if (!serial) {
      return Promise.reject(new Error("设备序列号缺失"));
    }

    close();

    return new Promise((resolve, reject) => {
      socket = new WebSocket(buildControlWebSocketUrl(serial));

      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", () => reject(new Error("控制 WebSocket 连接失败")));

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") {
          return;
        }

        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "ready") {
            ready.value = true;

            if (payload.screen) {
              screenSizeRef.value = payload.screen;
            }
          }
        } catch {
          // ignore
        }
      });

      socket.addEventListener("close", () => {
        ready.value = false;
      });
    });
  }

  function close() {
    if (socket) {
      socket.close();
      socket = null;
    }

    ready.value = false;
  }

  function mapPoint(event, canvas, screenSize) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = screenSize.width / rect.width;
    const scaleY = screenSize.height / rect.height;

    return {
      x: Math.round((event.clientX - rect.left) * scaleX),
      y: Math.round((event.clientY - rect.top) * scaleY),
    };
  }

  function sendTouch(action, event, canvas) {
    const screenSize = screenSizeRef.value;

    if (!canvas || !screenSize.width) {
      return;
    }

    send({
      type: "touch",
      action,
      point: mapPoint(event, canvas, screenSize),
    });
  }

  function bindCanvas(canvas) {
    if (!canvas) {
      return () => {};
    }

    const onPointerDown = (event) => {
      canvas.setPointerCapture(event.pointerId);
      sendTouch(MOTION_ACTION.DOWN, event, canvas);
    };

    const onPointerMove = (event) => {
      if ((event.buttons & 1) === 0) {
        return;
      }

      sendTouch(MOTION_ACTION.MOVE, event, canvas);
    };

    const onPointerUp = (event) => {
      sendTouch(MOTION_ACTION.UP, event, canvas);
    };

    const onWheel = (event) => {
      event.preventDefault();
      const screenSize = screenSizeRef.value;

      if (!screenSize.width) {
        return;
      }

      send({
        type: "scroll",
        point: mapPoint(event, canvas, screenSize),
        hscroll: event.deltaX > 0 ? 1 : event.deltaX < 0 ? -1 : 0,
        vscroll: event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0,
      });
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

  function sendNavigation(actionId) {
    send({ type: "navigation", action: actionId });
  }

  onBeforeUnmount(close);

  return {
    ready,
    connect,
    close,
    bindCanvas,
    sendNavigation,
    sendText: (text) => send({ type: "text", text }),
    setClipboard: (text, paste = true) => send({ type: "set_clipboard", text, paste }),
  };
}
