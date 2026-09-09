import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export default defineConfig({
  plugins: [solid()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["packages/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./test-setup.ts"],
  },
});
