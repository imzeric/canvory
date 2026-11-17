import type { Node, TextRun } from "@canvory/document-model";

/** 简化的 Penpot 形状输入（插件运行时映射到此结构） */
export interface PenpotShapeInput {
  id: string;
  type: "text" | "rect" | "circle" | "ellipse" | "line" | "image" | "path" | "group";
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  hidden?: boolean;
  fills?: Array<{ color?: string; opacity?: number }>;
  strokes?: Array<{ color?: string; width?: number }>;
  content?: { runs?: Array<Partial<TextRun> & { text: string }> };
  assetId?: string;
  points?: Array<{ x: number; y: number }>;
  children?: PenpotShapeInput[];
  radius?: number;
}

export function mapShape(shape: PenpotShapeInput): Node {
  const transform = {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation ?? 0,
  };
  const visible = !shape.hidden;

  if (shape.type === "group") {
    return {
      id: shape.id,
      type: "group",
      transform,
      visible,
      children: (shape.children ?? []).map(mapShape),
    };
  }

  if (shape.type === "text") {
    const runs: TextRun[] = (shape.content?.runs ?? [{ text: "" }]).map((r) => ({
      text: r.text,
      fontFamily: r.fontFamily ?? "Arial",
      fontSize: r.fontSize ?? 18,
      fontWeight: r.fontWeight ?? "400",
      italic: r.italic,
      color: r.color ?? "#000000",
      underline: r.underline,
    }));
    return { id: shape.id, type: "text", transform, visible, content: { runs } };
  }

  if (shape.type === "image") {
    return {
      id: shape.id,
      type: "image",
      transform,
      visible,
      assetId: shape.assetId ?? shape.id,
    };
  }

  if (shape.type === "path") {
    return {
      id: shape.id,
      type: "path",
      transform,
      visible,
      points: shape.points ?? [],
    };
  }

  const fill = shape.fills?.[0];
  const shapeKind =
    shape.type === "circle" || shape.type === "ellipse"
      ? "ellipse"
      : shape.type === "line"
        ? "line"
        : "rect";
  return {
    id: shape.id,
    type: "shape",
    transform,
    visible,
    shapeKind,
    fill: fill?.color
      ? { type: "solid", color: fill.color, opacity: fill.opacity }
      : undefined,
    stroke: shape.strokes?.[0]
      ? {
          color: shape.strokes[0].color ?? "#000000",
          width: shape.strokes[0].width ?? 1,
        }
      : undefined,
    radius: shape.radius,
  };
}
