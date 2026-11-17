import type { CanvoryDocument, Node } from "@canvory/document-model";
import {
  assertUniformSceneSizes,
  preflight,
  pxRectToInches,
  resolveRaster,
  slideSizeInches,
  type ExportMode,
  type RasterizeFn,
} from "@canvory/core";
import { pptxWriteOutputType } from "./output-type.js";
import { selectScenes, type ExportScope } from "./scope.js";
import { addTextBox } from "./text.js";
import { addShape, addSimplePath } from "./shapes.js";
import { PptxGenJS, type PptxApp, type PptxSlide } from "./pptx-types.js";

export interface BuildPptxOptions {
  mode?: ExportMode;
  scope?: ExportScope;
  /** 注入栅格化；缺省用占位 PNG（仍嵌入为图片，不回写 CDM） */
  rasterize?: RasterizeFn | null;
  /** 按 storageKey 解析字节 → data URL（Worker 路径） */
  resolveStorageKey?: (storageKey: string) => Promise<string | undefined>;
}

async function assetDataUrl(
  doc: CanvoryDocument,
  assetId: string,
  resolveStorageKey?: BuildPptxOptions["resolveStorageKey"],
): Promise<string | undefined> {
  const ref = doc.assets.find((a) => a.id === assetId);
  if (!ref) return undefined;
  if (ref.dataUrl) return ref.dataUrl;
  if (ref.storageKey && resolveStorageKey) {
    return resolveStorageKey(ref.storageKey);
  }
  return undefined;
}

async function addNode(
  pptx: PptxApp,
  slide: PptxSlide,
  doc: CanvoryDocument,
  node: Node,
  page: { width: number; height: number },
  skipIds: Set<string>,
  rasterIds: Set<string>,
  options: BuildPptxOptions,
): Promise<void> {
  if (skipIds.has(node.id)) return;

  if (node.type === "group") {
    for (const child of node.children) {
      await addNode(pptx, slide, doc, child, page, skipIds, rasterIds, options);
    }
    return;
  }

  const box = pxRectToInches(node.transform, page);

  // L2：嵌入栅格图（不修改 CDM）
  if (rasterIds.has(node.id)) {
    if (node.type === "image") {
      const data = await assetDataUrl(doc, node.assetId, options.resolveStorageKey);
      if (data) {
        slide.addImage({ data, x: box.x, y: box.y, w: box.w, h: box.h });
        return;
      }
    }
    const raster = await resolveRaster(
      {
        nodeId: node.id,
        widthPx: Math.max(1, Math.round(node.transform.width)),
        heightPx: Math.max(1, Math.round(node.transform.height)),
      },
      options.rasterize,
    );
    slide.addImage({ data: raster.data, x: box.x, y: box.y, w: box.w, h: box.h });
    return;
  }

  if (node.type === "text") {
    addTextBox(slide, node, box);
    return;
  }

  if (node.type === "shape") {
    addShape(pptx, slide, node, box, page.width);
    return;
  }

  if (node.type === "path") {
    addSimplePath(pptx, slide, node, box);
    return;
  }

  if (node.type === "image") {
    const data = await assetDataUrl(doc, node.assetId, options.resolveStorageKey);
    if (data) {
      slide.addImage({ data, x: box.x, y: box.y, w: box.w, h: box.h });
    }
  }
}

export async function buildPptx(
  doc: CanvoryDocument,
  options: BuildPptxOptions = {},
): Promise<{ buffer: Uint8Array; report: ReturnType<typeof preflight> }> {
  const mode = options.mode ?? "auto";
  const scope = options.scope ?? { sceneIds: "all" as const };
  const pageSize = assertUniformSceneSizes(doc, scope.sceneIds);
  const report = preflight(doc, mode, scope);

  if (report.blockingErrors.length > 0) {
    throw new Error(report.blockingErrors.map((e) => e.messageZh).join("; "));
  }

  const skipIds = new Set(
    report.pages.flatMap((p) => p.items.filter((i) => i.level === "L3").map((i) => i.nodeId)),
  );
  const rasterIds = new Set(
    report.pages.flatMap((p) => p.items.filter((i) => i.level === "L2").map((i) => i.nodeId)),
  );

  const pptx = new PptxGenJS();
  const { w, h } = slideSizeInches(pageSize);
  pptx.defineLayout({ name: "CANVORY", width: w, height: h });
  pptx.layout = "CANVORY";

  const scenes = selectScenes(doc, scope);
  for (const scene of scenes) {
    const slide = pptx.addSlide();
    if (scene.notes) slide.addNotes(scene.notes);
    for (const node of scene.children) {
      await addNode(pptx, slide, doc, node, pageSize, skipIds, rasterIds, options);
    }
  }

  const output = await pptx.write({ outputType: pptxWriteOutputType() });
  const buffer = output instanceof Uint8Array ? output : new Uint8Array(output);
  return { buffer, report };
}
