import path from "node:path";
import { defineConfig } from "vite";

/** 插件沙箱脚本打成单个 IIFE，避免 Penpot 无法加载分包 import。 */
export default defineConfig({
  resolve: {
    alias: {
      "@canvory/core": path.resolve("src/assistant/core-sandbox.ts"),
    },
  },
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "src/plugin.ts",
      name: "CanvoryPenpotPlugin",
      formats: ["iife"],
      fileName: () => "plugin.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});