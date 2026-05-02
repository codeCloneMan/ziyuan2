import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI组件库
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],
          // 图标库
          'icons': ['lucide-react'],
          // 图表库
          'charts': ['recharts'],
        },
      },
    },
    // 增大chunk大小警告限制（可选，或保持默认500KB）
    chunkSizeWarningLimit: 600,
  },
});