import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import { applyProjectEnv } from "../../tools/env-loader.js";

const { host, backendPort, frontendPort, backendOrigin } = applyProjectEnv();

export default defineConfig({
  plugins: [vue()],
  server: {
    host,
    port: frontendPort,
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host,
    port: frontendPort,
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
