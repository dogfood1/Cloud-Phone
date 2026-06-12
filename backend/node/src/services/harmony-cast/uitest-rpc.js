import net from "node:net";

import { logHarmonyCastInfo, logHarmonyCastWarn } from "./cast-logger.js";
import {
  buildUitestSessionId,
  decodeUitestFrames,
  encodeUitestFrame,
} from "./uitest-framing.js";

const SOCKET_TIMEOUT_MS = 20_000;
const MODULE = "com.ohos.devicetest.hypiumApiHelper";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonBody(body) {
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }
}

function formatRpcError(exception) {
  if (typeof exception === "string") {
    return exception;
  }

  if (exception && typeof exception === "object" && "message" in exception) {
    return String(exception.message);
  }

  return JSON.stringify(exception);
}

export class UitestRpcClient {
  /**
   * @param {number} localPort
   * @param {string} serial
   */
  constructor(localPort, serial) {
    this.localPort = localPort;
    this.serial = serial;
    /** @type {import("node:net").Socket | null} */
    this.socket = null;
    this.driverRef = "";
    /** @type {Buffer} */
    this.buffer = Buffer.alloc(0);
    /** @type {Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void, timer: NodeJS.Timeout }>} */
    this.pending = new Map();
    /** @type {Map<number, Set<(body: Buffer) => void>>} */
    this.captureListeners = new Map();
    this.onSocketData = this.onSocketData.bind(this);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: "127.0.0.1", port: this.localPort });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error("uitest RPC connect timeout"));
      }, SOCKET_TIMEOUT_MS);

      socket.once("connect", () => {
        clearTimeout(timer);
        socket.setNoDelay(true);
        socket.setTimeout(0);
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        socket.on("data", this.onSocketData);
        resolve();
      });

      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    logHarmonyCastInfo(this.serial, "uitest.rpc.connected", { localPort: this.localPort });
  }

  close() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("uitest RPC socket closed"));
    }

    this.pending.clear();
    this.captureListeners.clear();
    this.socket?.off("data", this.onSocketData);
    this.socket?.destroy();
    this.socket = null;
    this.buffer = Buffer.alloc(0);
  }

  onSocketData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const { frames, rest } = decodeUitestFrames(this.buffer);
    this.buffer = rest;

    for (const frame of frames) {
      this.handleFrame(frame.sessionId, frame.body);
    }
  }

  handleFrame(sessionId, body) {
    const pending = this.pending.get(sessionId);

    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(sessionId);

      const data = parseJsonBody(body);

      if (data?.exception) {
        const error = new Error(formatRpcError(data.exception));
        error.code = "uitest_rpc_failed";
        pending.reject(error);
        return;
      }

      pending.resolve({
        sessionId,
        result: data?.result ?? body,
        raw: data,
      });
      return;
    }

    const listeners = this.captureListeners.get(sessionId);

    if (listeners) {
      for (const listener of listeners) {
        listener(body);
      }
    }
  }

  sendMessage(payload, timeoutMs = SOCKET_TIMEOUT_MS) {
    if (!this.socket) {
      throw new Error("uitest RPC socket is not connected.");
    }

    const raw = JSON.stringify(payload);
    const sessionId = buildUitestSessionId(raw);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(sessionId);
        reject(new Error("uitest RPC read timeout"));
      }, timeoutMs);

      this.pending.set(sessionId, { resolve, reject, timer });
      this.socket.write(encodeUitestFrame(sessionId, raw));
    });
  }

  async invoke(api, args = [], options = {}) {
    const thisValue = Object.prototype.hasOwnProperty.call(options, "this")
      ? options.this
      : this.driverRef;

    return this.sendMessage({
      module: MODULE,
      method: "callHypiumApi",
      params: {
        api,
        this: thisValue,
        args,
        message_type: "hypium",
      },
    });
  }

  async invokeCaptures(api, args = {}) {
    return this.sendMessage({
      module: MODULE,
      method: "Captures",
      params: { api, args },
    });
  }

  async createDriver() {
    const response = await this.invoke("Driver.create", [], { this: null });
    const driverRef = Array.isArray(response.result) ? response.result[0] : response.result;
    this.driverRef = String(driverRef || "Driver#0");
    return this.driverRef;
  }

  async connectAndCreateDriver() {
    let lastError = new Error("Unable to create uitest driver.");

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        this.close();
        await delay(300 * attempt);
        await this.connect();
        return await this.createDriver();
      } catch (error) {
        lastError = error instanceof Error ? error : lastError;
        logHarmonyCastWarn(this.serial, "uitest.driver.retry", {
          attempt,
          message: lastError.message,
        });
      }
    }

    throw lastError;
  }

  watchCaptureSession(sessionId, listener) {
    const normalized = Number(sessionId);

    if (!this.captureListeners.has(normalized)) {
      this.captureListeners.set(normalized, new Set());
    }

    this.captureListeners.get(normalized).add(listener);
  }

  unwatchCaptureSession(sessionId, listener) {
    const normalized = Number(sessionId);
    const listeners = this.captureListeners.get(normalized);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.captureListeners.delete(normalized);
    }
  }
}
