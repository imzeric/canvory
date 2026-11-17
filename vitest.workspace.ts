import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*/vitest.config.ts",
  "packages/adapters/*/vitest.config.ts",
  "packages/exporters/*/vitest.config.ts",
  "packages/renderer/*/vitest.config.ts",
]);
