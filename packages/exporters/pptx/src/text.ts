import type { TextNode } from "@canvory/document-model";
import { mapFontFamily } from "@canvory/core";
import type { PptxSlide } from "./pptx-types.js";
import { toPptxRgb } from "./color.js";

export function addTextBox(
  slide: PptxSlide,
  node: TextNode,
  box: { x: number; y: number; w: number; h: number },
): void {
  const runs = node.content.runs.map((r) => ({
    text: r.text,
    options: {
      fontSize: r.fontSize,
      fontFace: mapFontFamily(r.fontFamily),
      color: toPptxRgb(r.color),
      bold: String(r.fontWeight) === "700" || Number(r.fontWeight) >= 600,
      italic: r.italic ?? false,
      underline: r.underline ? { type: "sng" as const } : undefined,
    },
  }));

  slide.addText(runs, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    align: node.align ?? "left",
    valign: node.valign ?? "top",
    rotate: node.transform.rotation,
    margin: 0,
  });
}
