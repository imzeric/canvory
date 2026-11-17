import { describe, expect, it } from "vitest";
import type { CanvoryDocument } from "@canvory/document-model";
import { assertUniformSceneSizes } from "./size-guard.js";

function doc(sizes: Array<{ w: number; h: number }>): CanvoryDocument {
  return {
    id: "d",
    schemaVersion: "1.0.0",
    title: "t",
    type: "presentation",
    settings: { width: 1920, height: 1080, unit: "px" },
    scenes: sizes.map((s, i) => ({
      id: `s${i}`,
      name: `page${i}`,
      type: "slide",
      width: s.w,
      height: s.h,
      children: [],
    })),
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: 0, updatedAt: 0, version: 1 },
  };
}

describe("assertUniformSceneSizes", () => {
  it("passes when sizes match", () => {
    expect(assertUniformSceneSizes(doc([{ w: 1920, h: 1080 }, { w: 1920, h: 1080 }]), "all")).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("throws SIZE_MISMATCH", () => {
    expect(() => assertUniformSceneSizes(doc([{ w: 1920, h: 1080 }, { w: 1280, h: 720 }]), "all")).toThrow(
      /SIZE_MISMATCH|尺寸/,
    );
  });
});
