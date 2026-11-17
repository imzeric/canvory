import { describe, expect, it } from "vitest";
import { buildPptx } from "./build.js";
import { pptxWriteOutputType } from "./output-type.js";

describe("pptxWriteOutputType", () => {
  it("uses uint8array when a window exists, including the Penpot plugin iframe", () => {
    expect(pptxWriteOutputType({ hasWindow: true })).toBe("uint8array");
  });

  it("uses nodebuffer for the worker and CLI", () => {
    expect(pptxWriteOutputType({ hasWindow: false })).toBe("nodebuffer");
  });
});

describe("buildPptx bytes", () => {
  it("returns a ZIP buffer from the node runtime", async () => {
    const now = Date.now();
    const { buffer } = await buildPptx({
      id: "doc-bytes",
      schemaVersion: "1.0.0",
      title: "bytes",
      type: "presentation",
      settings: { width: 1920, height: 1080, unit: "px" },
      scenes: [
        {
          id: "s1",
          name: "P1",
          type: "slide",
          children: [
            {
              id: "t1",
              type: "text",
              transform: { x: 40, y: 40, width: 400, height: 80, rotation: 0 },
              content: {
                runs: [
                  {
                    text: "IT7484-NODE",
                    fontFamily: "Arial",
                    fontSize: 24,
                    fontWeight: "400",
                    color: "#111111",
                  },
                ],
              },
            },
          ],
        },
      ],
      assets: [],
      animations: [],
      interactions: [],
      metadata: { createdAt: now, updatedAt: now, version: 1 },
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(buffer.subarray(0, 2)).toString()).toBe("PK");
  });
});
