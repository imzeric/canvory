/**
 * Penpot Plugin API 桥接（T080 / T084 / T085）
 * 对齐官方 API：currentPage.findShapes({ type: "board" })、Board.children、selection、currentFile。
 * 禁止依赖已移除的 getPage / 虚构 shapes 索引。
 * 无宿主时回退 DEMO（本地 Vite 预览）。
 */
import type { PenpotBoardInput, PenpotShapeInput } from "@canvory/adapter-penpot";
import type { AssetRef } from "@canvory/document-model";

export type HostBoard = PenpotBoardInput & { name: string };

export type HostExtractResult = {
  boards: HostBoard[];
  source: "penpot" | "demo";
  title: string;
  assets: AssetRef[];
};

declare global {
  // eslint-disable-next-line no-var
  var penpot: PenpotHostApi | undefined;
}

/** 官方 Plugin Context 的最小子集 */
interface PenpotHostApi {
  ui?: { open?: (title: string, url: string, options?: { width?: number; height?: number }) => void };
  selection?: PenpotShape[];
  currentFile?: { name?: string; id?: string } | null;
  currentPage?: PenpotPage | null;
}

interface PenpotPage {
  id: string;
  name: string;
  findShapes: (criteria?: { type?: string; name?: string }) => PenpotShape[];
  getShapeById?: (id: string) => PenpotShape | null;
}

interface PenpotFill {
  fillColor?: string;
  fillOpacity?: number;
  color?: string;
  opacity?: number;
}

interface PenpotStroke {
  strokeColor?: string;
  strokeWidth?: number;
  color?: string;
  width?: number;
}

interface PenpotShape {
  id: string;
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  hidden?: boolean;
  visible?: boolean;
  fills?: PenpotFill[];
  strokes?: PenpotStroke[];
  children?: PenpotShape[];
  characters?: string;
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  content?: unknown;
  borderRadius?: number;
  export?: (config: { type: string; scale?: number }) => Promise<Uint8Array>;
}

const DEMO_BOARDS: HostBoard[] = [
  {
    id: "b1",
    name: "封面",
    width: 1920,
    height: 1080,
    children: [
      {
        id: "t1",
        type: "text",
        x: 100,
        y: 100,
        width: 800,
        height: 80,
        content: {
          runs: [
            {
              text: "Canvory Demo",
              fontSize: 48,
              fontFamily: "Arial",
              fontWeight: "700",
              color: "#111111",
            },
          ],
        },
      },
      {
        id: "r1",
        type: "rect",
        x: 100,
        y: 220,
        width: 400,
        height: 200,
        fills: [{ color: "#4A90D9" }],
      },
      {
        id: "img1",
        type: "image",
        x: 560,
        y: 220,
        width: 200,
        height: 200,
        assetId: "demo-img-1",
      },
    ],
  },
  {
    id: "b2",
    name: "内容",
    width: 1920,
    height: 1080,
    children: [
      {
        id: "t2",
        type: "text",
        x: 80,
        y: 80,
        width: 600,
        height: 60,
        content: {
          runs: [
            { text: "第二", fontSize: 32, fontFamily: "Arial", fontWeight: "400", color: "#222222" },
            { text: "页", fontSize: 32, fontFamily: "Arial", fontWeight: "700", color: "#4A90D9" },
          ],
        },
      },
    ],
  },
  {
    id: "b3",
    name: "结尾",
    width: 1920,
    height: 1080,
    children: [
      {
        id: "t3",
        type: "text",
        x: 80,
        y: 80,
        width: 600,
        height: 60,
        content: {
          runs: [
            {
              text: "谢谢",
              fontSize: 40,
              fontFamily: "Arial",
              fontWeight: "700",
              color: "#000000",
            },
          ],
        },
      },
    ],
  },
];

const DEMO_ASSETS: AssetRef[] = [
  {
    id: "demo-img-1",
    type: "image",
    mimeType: "image/png",
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6aAAAAAElFTkSuQmCC",
  },
];

function bytesToDataUrl(bytes: Uint8Array, mime = "image/png"): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function mapType(typeRaw: string | undefined): PenpotShapeInput["type"] {
  const t = (typeRaw ?? "rectangle").toLowerCase();
  if (t === "text") return "text";
  if (t === "ellipse" || t === "circle") return "ellipse";
  if (t === "image") return "image";
  if (t === "path" || t === "svg-raw") return "path";
  if (t === "group" || t === "boolean" || t === "bool") return "group";
  if (t === "line") return "line";
  if (t === "board" || t === "frame") return "group";
  return "rect";
}

/** 从 Penpot Text.content / characters / 顶层字体字段解析多 run */
export function parseTextRuns(shape: PenpotShape): Array<{
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}> {
  const defaultFill =
    shape.fills?.[0]?.fillColor ?? shape.fills?.[0]?.color ?? "#000000";
  const defaultFamily = shape.fontFamily ?? "Arial";
  const defaultSize = Number(shape.fontSize ?? 18) || 18;
  const defaultWeight = String(shape.fontWeight ?? "400");

  const runs: Array<{
    text: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  }> = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === "string" && n.text.length) {
      const fills = n.fills as PenpotFill[] | undefined;
      runs.push({
        text: n.text,
        fontFamily: (n.fontFamily as string) ?? defaultFamily,
        fontSize: Number(n.fontSize ?? defaultSize) || defaultSize,
        fontWeight: String(n.fontWeight ?? defaultWeight),
        italic: n.fontStyle === "italic" || n.italic === true,
        underline:
          n.textDecoration === "underline" ||
          n.underline === true ||
          n.textDecoration === "underline solid",
        color: fills?.[0]?.fillColor ?? fills?.[0]?.color ?? defaultFill,
      });
      return;
    }
    const children = n.children;
    if (Array.isArray(children)) {
      for (const c of children) walk(c);
    }
  }

  if (shape.content) walk(shape.content);

  if (runs.length === 0) {
    const text = shape.characters ?? "";
    if (text) {
      runs.push({
        text,
        fontFamily: defaultFamily,
        fontSize: defaultSize,
        fontWeight: defaultWeight,
        color: defaultFill,
      });
    }
  }

  return runs;
}

async function exportPngDataUrl(shape: PenpotShape): Promise<string | null> {
  if (typeof shape.export !== "function") return null;
  try {
    const bytes = await shape.export({ type: "png", scale: 2 });
    if (!bytes?.length) return null;
    return bytesToDataUrl(bytes, "image/png");
  } catch {
    return null;
  }
}

async function mapShape(
  raw: PenpotShape,
  assetBag: Map<string, AssetRef>,
  opts?: { exportImages?: boolean },
): Promise<PenpotShapeInput> {
  const type = mapType(raw.type);
  const children: PenpotShapeInput[] = [];
  if (raw.children?.length) {
    for (const c of raw.children) {
      // 嵌套 board 当作 group 展开
      children.push(await mapShape(c, assetBag, opts));
    }
  }

  const fillColor = raw.fills?.[0]?.fillColor ?? raw.fills?.[0]?.color;
  const stroke = raw.strokes?.[0];
  const hidden = raw.hidden === true || raw.visible === false;

  let assetId: string | undefined;
  if (type === "image" || (opts?.exportImages && type !== "text" && type !== "group")) {
    // image 节点始终尝试导出；L2 栅格由 rasterizeShapeById 按需调用
  }
  if (type === "image") {
    assetId = raw.id;
    if (!assetBag.has(assetId)) {
      const dataUrl = opts?.exportImages === false ? null : await exportPngDataUrl(raw);
      assetBag.set(assetId, {
        id: assetId,
        type: "image",
        mimeType: "image/png",
        ...(dataUrl ? { dataUrl } : {}),
      });
    }
  }

  return {
    id: raw.id,
    type,
    name: raw.name,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    rotation: raw.rotation ?? 0,
    hidden,
    fills: fillColor
      ? [{ color: fillColor, opacity: raw.fills?.[0]?.fillOpacity ?? raw.fills?.[0]?.opacity }]
      : undefined,
    strokes: stroke
      ? [
          {
            color: stroke.strokeColor ?? stroke.color ?? "#000000",
            width: stroke.strokeWidth ?? stroke.width ?? 1,
          },
        ]
      : undefined,
    content:
      type === "text"
        ? {
            runs: parseTextRuns(raw).map((r) => ({
              text: r.text,
              fontFamily: r.fontFamily,
              fontSize: r.fontSize,
              fontWeight: r.fontWeight,
              italic: r.italic,
              underline: r.underline,
              color: r.color,
            })),
          }
        : undefined,
    children: children.length ? children : undefined,
    radius: raw.borderRadius,
    assetId,
  };
}

function isBoard(shape: PenpotShape): boolean {
  const t = (shape.type ?? "").toLowerCase();
  return t === "board" || t === "frame";
}

async function boardsFromShapes(
  shapes: PenpotShape[],
  assetBag: Map<string, AssetRef>,
): Promise<HostBoard[]> {
  const boards: HostBoard[] = [];
  for (const shape of shapes) {
    if (!isBoard(shape)) continue;
    const children: PenpotShapeInput[] = [];
    for (const child of shape.children ?? []) {
      children.push(await mapShape(child, assetBag));
    }
    boards.push({
      id: shape.id,
      name: shape.name ?? shape.id,
      width: shape.width ?? 1920,
      height: shape.height ?? 1080,
      children,
    });
  }
  return boards;
}

/**
 * 从 Penpot 宿主提取 board 列表（异步，含图片 export）。
 */
export async function readHostBoards(): Promise<HostExtractResult> {
  const api = globalThis.penpot;
  if (!api) {
    return {
      boards: DEMO_BOARDS,
      source: "demo",
      title: "Canvory Demo",
      assets: DEMO_ASSETS,
    };
  }

  const assetBag = new Map<string, AssetRef>();
  let boards: HostBoard[] = [];

  // 1) 选中的 board
  const selectedBoards = (api.selection ?? []).filter(isBoard);
  if (selectedBoards.length) {
    boards = await boardsFromShapes(selectedBoards, assetBag);
  }

  // 2) 当前页全部 board
  if (boards.length === 0 && api.currentPage?.findShapes) {
    const pageBoards = api.currentPage.findShapes({ type: "board" });
    boards = await boardsFromShapes(pageBoards, assetBag);
  }

  if (boards.length === 0) {
    return {
      boards: DEMO_BOARDS,
      source: "demo",
      title: "Canvory Demo (penpot 无可用 board)",
      assets: DEMO_ASSETS,
    };
  }

  return {
    boards,
    source: "penpot",
    title: api.currentFile?.name ?? "Penpot 导出",
    assets: [...assetBag.values()],
  };
}

export function isPenpotHost(): boolean {
  return Boolean(globalThis.penpot);
}

/** 按 shape id 导出 PNG data URL（L2 栅格化；不写回 CDM） */
export async function rasterizeShapeById(
  shapeId: string,
  _req?: { widthPx?: number; heightPx?: number },
): Promise<{ nodeId: string; mimeType: "image/png"; data: string } | null> {
  const api = globalThis.penpot;
  if (!api?.currentPage) return null;
  const shape =
    api.currentPage.getShapeById?.(shapeId) ??
    api.currentPage.findShapes?.({}).find((s) => s.id === shapeId);
  if (!shape) return null;
  const data = await exportPngDataUrl(shape);
  if (!data) return null;
  return { nodeId: shapeId, mimeType: "image/png", data };
}
