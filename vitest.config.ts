import path from "path"
import { defineConfig } from "vitest/config"

// Vitest 配置：复用 vite 的路径别名，仅用于纯函数单测（不启用 jsdom）
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
})
