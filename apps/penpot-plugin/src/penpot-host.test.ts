import { describe, expect, it } from "vitest";
import { isUserArtboard, parseTextRuns, PENPOT_ROOT_FRAME_ID } from "./penpot-host.js";

describe("isUserArtboard", () => {
  it("skips the Penpot page root frame so mixed root size does not block export", () => {
    expect(isUserArtboard({ id: PENPOT_ROOT_FRAME_ID, type: "frame" })).toBe(false);
    expect(isUserArtboard({ id: "board-text", type: "board" })).toBe(true);
    expect(isUserArtboard({ id: "shape-1", type: "rect" })).toBe(false);
    expect(isUserArtboard({ id: PENPOT_ROOT_FRAME_ID, type: "board" })).toBe(false);
  });
});

describe("parseTextRuns (T084)", () => {
  it("flattens nested content children into multiple runs", () => {
    const runs = parseTextRuns({
      id: "t1",
      type: "text",
      fontFamily: "Arial",
      fontSize: 20,
      fills: [{ fillColor: "#111111" }],
      content: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                text: "Hello ",
                fontWeight: "400",
                fills: [{ fillColor: "#111111" }],
              },
              {
                text: "World",
                fontWeight: "700",
                fills: [{ fillColor: "#ff0000" }],
              },
            ],
          },
        ],
      },
    });
    expect(runs).toHaveLength(2);
    expect(runs[0]?.text).toBe("Hello ");
    expect(runs[1]?.text).toBe("World");
    expect(runs[1]?.fontWeight).toBe("700");
    expect(runs[1]?.color).toBe("#ff0000");
  });

  it("falls back to characters", () => {
    const runs = parseTextRuns({
      id: "t2",
      type: "text",
      characters: "plain",
      fontSize: 16,
    });
    expect(runs).toEqual([
      expect.objectContaining({ text: "plain", fontSize: 16 }),
    ]);
  });
});
