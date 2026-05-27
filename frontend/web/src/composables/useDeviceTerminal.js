import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

import { buildDeviceTerminalWebSocketUrl } from "../utils/device-terminal-url.js";

/** @returns {import("@xterm/xterm").ITheme} */
function resolveXtermTheme() {
  const dark = document.documentElement.getAttribute("data-theme") !== "light";

  if (dark) {
    return {
      background: "#1a1d24",
      foreground: "#e8eaed",
      cursor: "#7cb7ff",
      selectionBackground: "rgb(124 183 255 / 0.28)",
      black: "#1a1d24",
      red: "#f07178",
      green: "#98c379",
      yellow: "#e5c07b",
      blue: "#61afef",
      magenta: "#c678dd",
      cyan: "#56b6c2",
      white: "#abb2bf",
      brightBlack: "#5c6370",
      brightRed: "#f07178",
      brightGreen: "#98c379",
      brightYellow: "#e5c07b",
      brightBlue: "#61afef",
      brightMagenta: "#c678dd",
      brightCyan: "#56b6c2",
      brightWhite: "#ffffff",
    };
  }

  return {
    background: "#f8f9fb",
    foreground: "#1f2937",
    cursor: "#2563eb",
    selectionBackground: "rgb(37 99 235 / 0.2)",
    black: "#1f2937",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#f8f9fb",
    brightBlack: "#6b7280",
    brightRed: "#ef4444",
    brightGreen: "#22c55e",
    brightYellow: "#eab308",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#ffffff",
  };
}

/**
 * @param {{ device: import("vue").Ref<{ serial?: string, connected?: boolean } | null>, open: import("vue").Ref<boolean> }} props
 */
export function useDeviceTerminal(props) {
  const status = ref("idle");
  const errorMessage = ref("");
  const hostRef = ref(null);

  /** @type {import("vue").ShallowRef<import("@xterm/xterm").Terminal | null>} */
  const termRef = shallowRef(null);
  /** @type {import("vue").ShallowRef<import("@xterm/addon-fit").FitAddon | null>} */
  const fitRef = shallowRef(null);

  /** @type {WebSocket | null} */
  let socket = null;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;
  let resizeTimer = null;

  function sendResize() {
    const term = termRef.value;
    const fit = fitRef.value;

    if (!term || !fit || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    fit.fit();
    const { cols, rows } = term;

    socket.send(
      JSON.stringify({
        type: "resize",
        cols,
        rows,
      }),
    );
  }

  function scheduleResize() {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }

    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      sendResize();
    }, 80);
  }

  function disposeTerminal() {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    resizeObserver?.disconnect();
    resizeObserver = null;

    termRef.value?.dispose();
    termRef.value = null;
    fitRef.value = null;
  }

  function closeSocket() {
    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }

    socket = null;
  }

  function teardown() {
    closeSocket();
    disposeTerminal();
    status.value = "idle";
  }

  function mountTerminal() {
    const host = hostRef.value;

    if (!host) {
      return;
    }

    disposeTerminal();

    const fitAddon = new FitAddon();
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      lineHeight: 1.15,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      scrollback: 5000,
      convertEol: false,
      theme: resolveXtermTheme(),
    });

    term.loadAddon(fitAddon);
    term.open(host);
    fitAddon.fit();

    termRef.value = term;
    fitRef.value = fitAddon;

    term.onData((data) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      socket.send(new TextEncoder().encode(data));
    });

    term.onResize(() => {
      scheduleResize();
    });

    resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });
    resizeObserver.observe(host);
  }

  function connect() {
    const serial = props.device.value?.serial;

    if (!serial) {
      errorMessage.value = "设备序列号无效";
      status.value = "error";
      return;
    }

    if (!props.device.value?.connected) {
      errorMessage.value = "设备未在线";
      status.value = "error";
      return;
    }

    teardown();
    errorMessage.value = "";
    status.value = "connecting";

    mountTerminal();

    socket = new WebSocket(buildDeviceTerminalWebSocketUrl(serial));
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", () => {
      status.value = "connected";
      scheduleResize();
      termRef.value?.focus();
    });

    socket.addEventListener("message", (event) => {
      const term = termRef.value;

      if (!term) {
        return;
      }

      if (typeof event.data === "string") {
        term.write(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
        return;
      }

      if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buf) => {
          term.write(new Uint8Array(buf));
        });
      }
    });

    socket.addEventListener("error", () => {
      errorMessage.value = "终端连接失败";
      status.value = "error";
    });

    socket.addEventListener("close", () => {
      if (status.value !== "error") {
        status.value = "closed";
      }
    });
  }

  watch(
    () => props.open.value,
    async (isOpen) => {
      if (isOpen) {
        await nextTick();
        connect();
        return;
      }

      teardown();
    },
  );

  onBeforeUnmount(() => {
    teardown();
  });

  return {
    status,
    errorMessage,
    hostRef,
    reconnect: connect,
  };
}
