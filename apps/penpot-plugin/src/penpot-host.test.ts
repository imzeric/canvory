import { describe, expect, it } from "vitest";
import {
  bytesToDataUrl,
  dataUrlFromExportBytes,
  isUserArtboard,
  parseTextRuns,
  PENPOT_ROOT_FRAME_ID,
} from "./penpot-host.js";

describe("isUserArtboard", () => {
  it("skips the Penpot page root frame so mixed root size does not block export", () => {
    expect(isUserArtboard({ id: PENPOT_ROOT_FRAME_ID, type: "frame" })).toBe(false);
    expect(isUserArtboard({ id: "board-text", type: "board" })).toBe(true);
    expect(isUserArtboard({ id: "shape-1", type: "rect" })).toBe(false);
    expect(isUserArtboard({ id: PENPOT_ROOT_FRAME_ID, type: "board" })).toBe(false);
  });
});

describe("image export bytes", () => {
  const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

  it("encodes PNG bytes without btoa so the Penpot SES compartment can embed them", () => {
    const original = globalThis.btoa;
    globalThis.btoa = () => {
      throw new TypeError("Illegal invocation");
    };
    try {
      const url = bytesToDataUrl(png);
      expect(url).toBe(`data:image/png;base64,${Buffer.from(png).toString("base64")}`);
      const like: { length: number; byteLength: number; [index: number]: number } = {
        length: png.length,
        byteLength: png.length,
      };
      png.forEach((value, index) => {
        like[index] = value;
      });
      expect(dataUrlFromExportBytes(like)).toBe(url);
      expect(dataUrlFromExportBytes(png)).toBe(url);
      expect(dataUrlFromExportBytes(new Uint8Array())).toBeNull();
    } finally {
      globalThis.btoa = original;
    }
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
