import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  // 模擬正式環境 nginx 的 /api 轉發；vite preview 也會沿用這個設定
  server: {
    proxy: {
      "/api": "http://localhost:8000"
    }
  }
});
