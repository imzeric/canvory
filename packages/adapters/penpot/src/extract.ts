import type { AssetRef, CanvoryDocument, Node, Scene } from "@canvory/document-model";
import { mapShape, type PenpotShapeInput } from "./nodes.js";

export interface PenpotBoardInput {
  id: string;
  name: string;
  width: number;
  height: number;
  children: PenpotShapeInput[];
  notes?: string;
}

export interface PenpotExtractInput {
  documentId?: string;
  title?: string;
  boards: PenpotBoardInput[];
  sort?: "position" | "name";
  /** 可选：已上传的图片资源 */
  assets?: AssetRef[];
}

function collectImageAssets(nodes: Node[], into: Map<string, AssetRef>): void {
  for (const node of nodes) {
    if (node.type === "image") {
      if (!into.has(node.assetId)) {
        into.set(node.assetId, {
          id: node.assetId,
          type: "image",
        });
      }
    }
    if (node.type === "group") collectImageAssets(node.children, into);
  }
}

export function extractDocument(input: PenpotExtractInput): CanvoryDocument {
  const boards = [...input.boards];
  if (input.sort === "name") {
    boards.sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }

  const first = boards[0];
  const width = first?.width ?? 1920;
  const height = first?.height ?? 1080;
  const now = Date.now();

  const scenes: Scene[] = boards.map((b) => ({
    id: b.id,
    name: b.name,
    type: "slide",
    width: b.width,
    height: b.height,
    children: b.children.map(mapShape),
    notes: b.notes,
  }));

  const assetMap = new Map<string, AssetRef>();
  for (const scene of scenes) collectImageAssets(scene.children, assetMap);
  // 宿主提供的 dataUrl/storageKey 覆盖占位 AssetRef（T084）
  for (const a of input.assets ?? []) {
    const prev = assetMap.get(a.id);
    assetMap.set(a.id, { ...prev, ...a, id: a.id, type: a.type ?? prev?.type ?? "image" });
  }

  return {
    id: input.documentId ?? crypto.randomUUID(),
    schemaVersion: "1.0.0",
    title: input.title ?? "未命名演示文稿",
    type: "presentation",
    settings: { width, height, unit: "px" },
    scenes,
    assets: [...assetMap.values()],
    animations: [],
    interactions: [],
    metadata: { createdAt: now, updatedAt: now, version: 1 },
  };
}
