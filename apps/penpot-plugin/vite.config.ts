import { copyFileSync, mkdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function copyManifest(): Plugin {
  return {
    name: "copy-penpot-manifest",
    closeBundle() {
      mkdirSync("dist", { recursive: true });
      copyFileSync("manifest.json", "dist/manifest.json");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 4400,
    cors: true,
  },
  preview: {
    port: 4400,
    cors: true,
  },
});
