import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export default defineConfig({
  plugins: [solid()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
});
