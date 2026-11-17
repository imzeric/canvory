import type { PathNode, ShapeNode } from "@canvory/document-model";
import type { PptxApp, PptxSlide } from "./pptx-types.js";
import { toPptxRgb } from "./color.js";

function solidColor(node: ShapeNode): string {
  return toPptxRgb(
    node.fill && node.fill.type === "solid" ? node.fill.color : "#CCCCCC",
    "CCCCCC",
  );
}

export function addShape(
  pptx: PptxApp,
  slide: PptxSlide,
  node: ShapeNode,
  box: { x: number; y: number; w: number; h: number },
  pageWidth: number,
): void {
  const fill = {
    color: solidColor(node),
    transparency: Math.round((1 - (node.opacity ?? 1)) * 100),
  };
  const line = node.stroke
    ? { color: toPptxRgb(node.stroke.color), width: node.stroke.width }
    : undefined;

  const shadow = node.shadow
    ? {
        type: "outer" as const,
        color: toPptxRgb(node.shadow.color),
        blur: node.shadow.blur,
        offset: Math.hypot(node.shadow.offsetX, node.shadow.offsetY),
        opacity: 0.35,
      }
    : undefined;

  if (node.shapeKind === "ellipse") {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      fill,
      line,
      shadow,
    });
    return;
  }
  if (node.shapeKind === "line") {
    slide.addShape(pptx.ShapeType.line, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      line: line ?? { color: "000000", width: 1 },
    });
    return;
  }
  slide.addShape(pptx.ShapeType.roundRect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill,
    line,
    rectRadius: node.radius ? node.radius / pageWidth : 0,
    shadow,
  });
}

export function addSimplePath(
  pptx: PptxApp,
  slide: PptxSlide,
  node: PathNode,
  box: { x: number; y: number; w: number; h: number },
): void {
  if (node.points.length < 2) return;
  const pts = node.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    slide.addShape(pptx.ShapeType.line, {
      x: box.x + (a.x / Math.max(node.transform.width, 1)) * box.w,
      y: box.y + (a.y / Math.max(node.transform.height, 1)) * box.h,
      w: ((b.x - a.x) / Math.max(node.transform.width, 1)) * box.w,
      h: ((b.y - a.y) / Math.max(node.transform.height, 1)) * box.h,
      line: { color: "333333", width: 1.5 },
    });
  }
}
