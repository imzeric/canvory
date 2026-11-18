import { describe, expect, it } from "vitest";
import { generateWithProvider } from "./generate.js";
import type { ModelProvider } from "./provider.js";

const jsonProvider: ModelProvider = {
  id: "fixture",
  async *complete() {
    yield {
      chunkId: "chunk-1",
      text: JSON.stringify([{ op: "createBoard", name: "封面", width: 1920, height: 1080 }]),
    };
  },
};

describe("generateWithProvider", () => {
  it("cites material chunks and does not draw", async () => {
    const result = await generateWithProvider(
      jsonProvider,
      { demand: "做一页封面", materials: [{ id: "mat-1", text: "引用资料" }], maxChars: 100 },
      new AbortController().signal,
    );
    expect(result.drawn).toBe(false);
    expect(result.ops).toEqual([{ op: "createBoard", name: "封面", width: 1920, height: 1080 }]);
    expect(result.sourceRefs).toEqual(["material-mat-1-1"]);
    expect(result.system).toBe("你只返回 JSON 操作数组。");
    expect(result.system.includes("引用资料")).toBe(false);
    expect(result.user).toContain("引用资料");
  });

  it("rejects a model payload outside the whitelist", async () => {
    const provider: ModelProvider = {
      id: "fixture",
      async *complete() {
        yield { chunkId: "chunk-1", text: JSON.stringify([{ op: "createBoard", name: "封面", width: 1, height: 1, code: "1" }]) };
      },
    };
    await expect(
      generateWithProvider(provider, { demand: "需求", materials: [], maxChars: 100 }, new AbortController().signal),
    ).rejects.toThrow("HOST_OP_REJECTED");
  });
});
