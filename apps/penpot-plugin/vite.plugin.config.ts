import { defineConfig } from "vite";

/** 插件沙箱脚本打成单个 IIFE，避免 Penpot 无法加载分包 import。 */
export default defineConfig({
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