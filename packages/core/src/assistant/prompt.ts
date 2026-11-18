import type { ModelChunk } from "./provider.js";

export const SYSTEM_PROMPT = "你只返回 JSON 操作数组。";

export function buildModelRequest(chunks: ModelChunk[]): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: chunks.map((chunk) => chunk.text).join("\n"),
  };
}
