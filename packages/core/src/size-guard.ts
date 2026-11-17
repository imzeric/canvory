import type { CanvoryDocument, Scene } from "@canvory/document-model";
import { CanvoryError, messageZh } from "@canvory/shared";

export function sceneSize(doc: CanvoryDocument, scene: Scene): { width: number; height: number } {
  return {
    width: scene.width ?? doc.settings.width,
    height: scene.height ?? doc.settings.height,
  };
}

export function assertUniformSceneSizes(
  doc: CanvoryDocument,
  sceneIds: string[] | "all",
): { width: number; height: number } {
  const scenes =
    sceneIds === "all"
      ? doc.scenes
      : doc.scenes.filter((s) => sceneIds.includes(s.id));

  if (scenes.length === 0) {
    throw new CanvoryError("VALIDATION_ERROR", "没有可导出的页面", 400);
  }

  const first = sceneSize(doc, scenes[0]!);
  const mismatches = scenes.filter((s) => {
    const sz = sceneSize(doc, s);
    return sz.width !== first.width || sz.height !== first.height;
  });

  if (mismatches.length > 0) {
    const detail = mismatches.map((s) => s.name || s.id).join("、");
    throw new CanvoryError("SIZE_MISMATCH", messageZh("SIZE_MISMATCH", `不一致页面：${detail}`), 409);
  }

  return first;
}
