import { afterEach, describe, expect, it, vi } from "vitest";
import { materialRetentionMessage, requestGeneration } from "./api.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestGeneration", () => {
  it("keeps validated operations from being treated as a finished drawing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ drawn: true, ops: [{ op: "createBoard", name: "封面", width: 1, height: 1 }] }), { status: 200 })),
    );
    const result = await requestGeneration({ fileId: "file-a", demand: "封面", materialIds: [] });
    expect(result.drawn).toBe(false);
    expect(result.message).toContain("尚未绘制");
    expect(result.message).toContain("不是外部模型验收");
    expect(result.ops).toHaveLength(1);
  });

  it("does not describe process memory as durable storage", () => {
    expect(materialRetentionMessage(false)).toContain("重启后会丢失");
    expect(materialRetentionMessage(true)).toContain("数据库");
  });
});
