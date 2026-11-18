import { describe, expect, it } from "vitest";
import { parseHostOps } from "./host-ops.js";

describe("parseHostOps", () => {
  it("rejects an operation that carries executable code", () => {
    expect(() =>
      parseHostOps([{ op: "createBoard", name: "封面", width: 1920, height: 1080, code: "process.exit(0)" }]),
    ).toThrow("HOST_OP_REJECTED");
  });

  it("rejects an unknown operation", () => {
    expect(() => parseHostOps([{ op: "eval", code: "1" }])).toThrow("HOST_OP_REJECTED");
  });

  it("accepts a createBoard operation", () => {
    expect(parseHostOps([{ op: "createBoard", name: "封面", width: 1920, height: 1080 }])).toEqual([
      { op: "createBoard", name: "封面", width: 1920, height: 1080 },
    ]);
  });

  it("accepts the other whitelist operations and nothing else", () => {
    expect(
      parseHostOps([
        { op: "createText", boardId: "b", name: "标题", text: "你好", x: 0, y: 0, width: 10, height: 10 },
        { op: "createRectangle", boardId: "b", name: "块", x: 0, y: 0, width: 10, height: 10 },
        { op: "createEllipse", boardId: "b", name: "圆", x: 0, y: 0, width: 10, height: 10 },
        { op: "setPluginData", target: "board", id: "b", key: "k", value: "v" },
        { op: "uploadMedia", boardId: "b", mediaId: "m", x: 0, y: 0, width: 10, height: 10 },
        { op: "replaceText", nodeId: "n", text: "新" },
      ]),
    ).toHaveLength(6);
  });
});
