import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

import { applyProjectEnv } from "../../tools/env-loader.js";

const { host, backendPort, frontendPort, backendOrigin } = applyProjectEnv();

const apiProxy = {
  target: backendOrigin,
  changeOrigin: true,
  ws: true,
  timeout: 120_000,
  proxyTimeout: 120_000,
  configure(proxy) {
    proxy.on("error", (error, request) => {
      console.error(
        `[vite] http proxy error: ${request?.url ?? "/api"} -> ${backendOrigin}`,
        error.message,
      );
      console.error(
        "[vite] Ensure backend is running: npm run dev (root) or npm run dev:backend",
      );
    });
  },
};

function backendHealthPlugin() {
  return {
    name: "cloud-phone-backend-health",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        fetch(`${backendOrigin}/health`)
          .then((response) => {
            // /health is protected and may return 401 when backend is healthy.
            if (!response.ok && ![401, 403].includes(response.status)) {
              throw new Error(`HTTP ${response.status}`);
            }
          })
          .catch(() => {
            console.warn(
              `\n[vite] Backend is not reachable at ${backendOrigin}.`,
            );
            console.warn("[vite] Start API first: npm run dev:backend\n");
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), basicSsl(), backendHealthPlugin()],
  server: {
    host,
    port: frontendPort,
    https: true,
    proxy: {
      "/api": apiProxy,
    },
  },
  preview: {
    host,
    port: frontendPort,
    proxy: {
      "/api": apiProxy,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
