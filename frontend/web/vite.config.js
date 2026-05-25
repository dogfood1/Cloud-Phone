import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import { applyProjectEnv } from "../../tools/env-loader.js";

const { host, backendPort, frontendPort, backendOrigin } = applyProjectEnv();

const apiProxy = {
  target: backendOrigin,
  changeOrigin: true,
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
            if (!response.ok) {
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
  plugins: [vue(), backendHealthPlugin()],
  server: {
    host,
    port: frontendPort,
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
