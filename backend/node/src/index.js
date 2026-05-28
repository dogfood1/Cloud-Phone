import { serverConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { setupDeviceWebSocket } from "./ws/device-websocket-server.js";

const { host, backendPort } = serverConfig;

const server = createApp();
setupDeviceWebSocket(server);

process.on("unhandledRejection", (reason) => {
  console.error("[backend] unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[backend] uncaughtException:", error);
});

server.listen(backendPort, host, () => {
  console.log(`Cloud Phone backend API listening on http://${host}:${backendPort}`);
  if (host === "0.0.0.0" || host === "::") {
    console.log(`LAN access: http://<your-ip>:${backendPort}`);
  }
  console.log("Start frontend: cd frontend/web && npm run dev");
});
