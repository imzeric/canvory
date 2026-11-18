export type DocumentType =
  | "presentation"
  | "storybook"
  | "animation"
  | "whiteboard"
  | "webpage";

export type SceneType = "slide" | "book-page" | "animation-scene" | "whiteboard" | "web-section";

export type Paint =
  | { type: "solid"; color: string; opacity?: number }
  | { type: "gradient" }
  | { type: "image"; assetId: string };

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextRun {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  italic?: boolean;
  color: string;
  underline?: boolean;
}

export interface NodeBase {
  id: string;
  transform: Transform;
  opacity?: number;
  visible?: boolean;
}

export interface TextNode extends NodeBase {
  type: "text";
  content: { runs: TextRun[] };
  align?: "left" | "center" | "right" | "justify";
  valign?: "top" | "middle" | "bottom";
}

export interface ShapeNode extends NodeBase {
  type: "shape";
  shapeKind: "rect" | "ellipse" | "line";
  fill?: Paint;
  stroke?: { color: string; width: number };
  radius?: number;
  /** 外阴影；能力外时由 degrade/exporter 降级 */
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

export interface ImageNode extends NodeBase {
  type: "image";
  assetId: string;
}

export interface PathNode extends NodeBase {
  type: "path";
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
}

export interface GroupNode extends NodeBase {
  type: "group";
  children: Node[];
}

export type Node = TextNode | ShapeNode | ImageNode | PathNode | GroupNode;

export interface AssetRef {
  id: string;
  type: "image" | "font" | "svg" | "audio" | "video";
  storageKey?: string;
  /** 浏览器内联导出用；Worker 路径应使用 storageKey */
  dataUrl?: string;
  mimeType?: string;
  hash?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface Scene {
  id: string;
  name: string;
  type: SceneType;
  width?: number;
  height?: number;
  background?: Paint;
  children: Node[];
  notes?: string;
  duration?: number;
}

export interface CanvoryDocument {
  id: string;
  schemaVersion: string;
  title: string;
  type: DocumentType;
  settings: {
    width: number;
    height: number;
    unit: "px";
    background?: string;
    aspectRatio?: string;
  };
  themeId?: string;
  scenes: Scene[];
  assets: AssetRef[];
  animations: unknown[];
  interactions: unknown[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: number;
  };
  outline?: Array<{
    id: string;
    title: string;
    body: string;
    status: "pending" | "drawing" | "drawn" | "failed" | "stopped" | "skipped_user_edit";
  }>;
  charts?: Array<{
    id: string;
    kind: "column" | "bar" | "line" | "pie" | "scatter";
    categories: string[];
    series: Array<{ name: string; values: number[] }>;
  }>;
}
