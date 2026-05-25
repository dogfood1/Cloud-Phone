import { serverConfig } from "./config/env.js";
import { createApp } from "./app.js";

const { host, backendPort } = serverConfig;

const app = createApp();

app.listen(backendPort, host, () => {
  console.log(`Cloud Phone backend API: http://127.0.0.1:${backendPort}`);
  console.log("Start frontend: cd frontend/web && npm run dev");
});
