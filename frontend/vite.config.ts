/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In development Vite serves the UI on :5173 and proxies the API to FastAPI (jat serve --dev).
// In production FastAPI serves the built files from dist/ on a single port.
const apiTarget = process.env.JAT_API_URL ?? "http://127.0.0.1:8770";

// The API docs page (/api/docs) loads Swagger UI from here rather than a CDN, so nothing is fetched
// from the web.
function swaggerUi(): Plugin {
  const root = dirname(createRequire(import.meta.url).resolve("swagger-ui-dist/package.json"));
  return {
    name: "swagger-ui",
    apply: "build",
    generateBundle() {
      for (const file of ["swagger-ui-bundle.js", "swagger-ui.css"]) {
        this.emitFile({
          type: "asset",
          fileName: `api-docs/${file}`,
          source: readFileSync(join(root, file)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swaggerUi()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": apiTarget },
  },
  build: { outDir: "dist", sourcemap: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
