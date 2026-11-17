import { describe, expect, it } from "vitest";
import type { DegradeResult } from "./degrade.js";
import { preflight, type ExportReportItem } from "./preflight.js";

function asDegradeResult(item: ExportReportItem): DegradeResult {
  return item;
}

describe("preflight report items", () => {
  it("uses the degrade result shape with no extra empty-interface fields", () => {
    const now = Date.now();
    const report = preflight({
      id: "doc-preflight",
      schemaVersion: "1.0.0",
      title: "preflight",
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
              transform: { x: 10, y: 10, width: 200, height: 40, rotation: 0 },
              content: {
                runs: [
                  {
                    text: "hello",
                    fontFamily: "Arial",
                    fontSize: 18,
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

    const item = report.pages[0]?.items[0];
    expect(item).toBeTruthy();
    const degrade = asDegradeResult(item!);
    expect(degrade).toEqual({
      nodeId: "t1",
      level: "L0",
      reasonCode: "NATIVE",
      messageZh: "可映射为原生对象。",
    });
    expect(Object.keys(item!).sort()).toEqual(["level", "messageZh", "nodeId", "reasonCode"]);
  });
});
