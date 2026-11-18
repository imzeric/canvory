import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGeneration } from "./api.js";

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
    expect(result.message).toContain("没有绘制画板");
    expect(result.ops).toHaveLength(1);
  });
});
