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

  it("accepts a 1.0.0 document without assistant fields", () => {
    const doc = parseCanvoryDocument({ ...sample, schemaVersion: "1.0.0" });
    expect(doc.schemaVersion).toBe("1.0.0");
    expect(doc.outline).toEqual([]);
    expect(doc.charts).toEqual([]);
  });

  it("accepts a 1.1.0 document with an outline and a chart", () => {
    const doc = parseCanvoryDocument({
      ...sample,
      schemaVersion: "1.1.0",
      outline: [{ id: "c1", title: "封面", body: "你好", status: "pending" }],
      charts: [{ id: "ch1", kind: "column", categories: ["A"], series: [{ name: "S", values: [1] }] }],
    });
    expect(doc.outline?.[0]?.title).toBe("封面");
    expect(doc.charts?.[0]?.kind).toBe("column");
  });

  it("rejects unsupported schemaVersion", () => {
    expect(() => parseCanvoryDocument({ ...sample, schemaVersion: "9.9.9" })).toThrow(
      /SCHEMA_UNSUPPORTED|不支持/,
    );
  });
});
