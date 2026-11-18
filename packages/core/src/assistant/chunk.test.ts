import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk.js";

describe("chunkText", () => {
  it("keeps a long outline instead of truncating it", () => {
    const input = "第一段。\n\n" + "乙".repeat(20);
    const chunks = chunkText(input, 10);
    expect(chunks.map((chunk) => chunk.text).join("")).toContain("乙".repeat(20));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("splits an oversized block on sentence marks before slicing", () => {
    const chunks = chunkText("甲。乙。丙", 2);
    expect(chunks.map((chunk) => chunk.text)).toEqual(["甲。", "乙。", "丙"]);
  });
});
