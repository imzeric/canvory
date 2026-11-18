import { describe, expect, it } from "vitest";
import { opsForNewBoard, readBoardRevision } from "./draw-plan.js";

describe("opsForNewBoard", () => {
  it("plans one board and one text child", () => {
    expect(opsForNewBoard({ name: "封面", text: "标题", width: 1920, height: 1080 })).toEqual([
      { op: "createBoard", name: "封面", width: 1920, height: 1080 },
      { op: "createText", boardId: "$new", name: "封面-标题", text: "标题", x: 120, y: 100, width: 880, height: 140 },
    ]);
  });

  it("reads only a nonnegative integer board revision", () => {
    expect(readBoardRevision("3")).toBe(3);
    expect(readBoardRevision("nope")).toBe(0);
    expect(readBoardRevision(null)).toBe(0);
  });
});
