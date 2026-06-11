import net from "node:net";

import { logHarmonyCastInfo } from "./cast-logger.js";

const SOCKET_TIMEOUT_MS = 20_000;

function buildRequestId() {
  const now = new Date();
  const pad = (value, size) => String(value).padStart(size, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}` +
    `${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}` +
    `${pad(now.getMilliseconds(), 3)}000`
  );
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
    this.driverRef = "Driver#0";
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
        socket.setTimeout(SOCKET_TIMEOUT_MS);
        this.socket = socket;
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
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  sendRawObject(payload) {
    if (!this.socket) {
      throw new Error("uitest RPC socket is not connected.");
    }

    const line = `${JSON.stringify(payload)}\n`;
    this.socket.write(line, "utf8");
  }

  async readLine(timeoutMs = SOCKET_TIMEOUT_MS) {
    if (!this.socket) {
      throw new Error("uitest RPC socket is not connected.");
    }

    return new Promise((resolve, reject) => {
      let buffer = "";

      const onData = (chunk) => {
        buffer += chunk.toString("utf8");
        const newlineIndex = buffer.indexOf("\n");

        if (newlineIndex >= 0) {
          cleanup();
          resolve(buffer.slice(0, newlineIndex));
        }
      };

      const onError = (error) => {
        cleanup();
        reject(error);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("uitest RPC read timeout"));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.socket?.off("data", onData);
        this.socket?.off("error", onError);
      };

      this.socket.on("data", onData);
      this.socket.on("error", onError);

      if (this.socket.readable) {
        const pending = this.socket.read();
        if (pending) {
          onData(pending);
        }
      }
    });
  }

  async invoke(api, args = [], thisRef = null) {
    const payload = {
      module: "com.ohos.devicetest.hypiumApiHelper",
      method: "callHypiumApi",
      params: {
        api,
        this: thisRef ?? this.driverRef,
        args,
        message_type: "hypium",
      },
      request_id: buildRequestId(),
      client: "127.0.0.1",
    };

    this.sendRawObject(payload);
    const raw = await this.readLine();
    const data = JSON.parse(raw);

    if (data?.exception) {
      const error = new Error(
        typeof data.exception === "string" ? data.exception : JSON.stringify(data.exception),
      );
      error.code = "uitest_rpc_failed";
      throw error;
    }

    return data;
  }

  async invokeCaptures(api, args = []) {
    const payload = {
      module: "com.ohos.devicetest.hypiumApiHelper",
      method: "Captures",
      params: { api, args },
      request_id: buildRequestId(),
    };

    this.sendRawObject(payload);
    const raw = await this.readLine();
    const data = JSON.parse(raw);

    if (data?.exception) {
      const error = new Error(
        typeof data.exception === "string" ? data.exception : JSON.stringify(data.exception),
      );
      error.code = "uitest_capture_failed";
      throw error;
    }

    return data;
  }

  async createDriver() {
    const response = await this.invoke("Driver.create", [], null);
    const driverRef = Array.isArray(response.result) ? response.result[0] : response.result;
    this.driverRef = driverRef || "Driver#0";
    return this.driverRef;
  }

  getSocket() {
    return this.socket;
  }
}
