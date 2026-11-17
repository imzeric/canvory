import { describe, expect, it } from "vitest";
import { parseCanvoryDocument } from "./schema.js";

const sample = {
  id: "doc-1",
  schemaVersion: "1.0.0",
  title: "样例",
  type: "presentation",
  settings: { width: 1920, height: 1080, unit: "px" },
  scenes: [
    {
      id: "s1",
      name: "01_封面",
      type: "slide",
      children: [],
    },
  ],
  assets: [],
  animations: [],
  interactions: [],
  metadata: { createdAt: 0, updatedAt: 0, version: 1 },
};

describe("parseCanvoryDocument", () => {
  it("accepts valid CDM 1.0.0", () => {
    expect(parseCanvoryDocument(sample).title).toBe("样例");
  });

  it("rejects unsupported schemaVersion", () => {
    expect(() => parseCanvoryDocument({ ...sample, schemaVersion: "9.9.9" })).toThrow(
      /SCHEMA_UNSUPPORTED|不支持/,
    );
  });
});
