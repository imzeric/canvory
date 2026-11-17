import type { CanvoryDocument } from "@canvory/document-model";
import type { ExportMode } from "./modes.js";
import { walkNodes, type DegradeLevel, type DegradeResult } from "./degrade.js";
import { assertUniformSceneSizes } from "./size-guard.js";
import { collectFonts } from "./font-map.js";

/** 与降级结果同一结构；用类型别名避免空接口。 */
export type ExportReportItem = DegradeResult;

export interface ExportReportPage {
  sceneId: string;
  name: string;
  counts: Record<DegradeLevel, number>;
  items: ExportReportItem[];
}

export interface ExportReport {
  schemaVersion: string;
  mode: ExportMode;
  blockingErrors: Array<{ code: string; messageZh: string }>;
  fonts: Array<{ sourceFamily: string; targetFamily: string; installHintZh: string }>;
  totals: Record<DegradeLevel, number>;
  pages: ExportReportPage[];
}

function emptyCounts(): Record<DegradeLevel, number> {
  return { L0: 0, L1: 0, L2: 0, L3: 0 };
}

export function preflight(
  doc: CanvoryDocument,
  mode: ExportMode = "auto",
  scope: { sceneIds: string[] | "all"; sort?: "position" | "name" } = { sceneIds: "all" },
): ExportReport {
  const blockingErrors: ExportReport["blockingErrors"] = [];
  try {
    assertUniformSceneSizes(doc, scope.sceneIds);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    blockingErrors.push({
      code: err.code ?? "SIZE_MISMATCH",
      messageZh: err.message ?? "尺寸不一致",
    });
  }

  const scenes =
    scope.sceneIds === "all"
      ? [...doc.scenes]
      : doc.scenes.filter((s) => scope.sceneIds.includes(s.id));

  if (scope.sort === "name") {
    scenes.sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }

  const pages: ExportReportPage[] = scenes.map((scene) => {
    const ctx = {
      sceneWidth: scene.width ?? doc.settings.width,
      sceneHeight: scene.height ?? doc.settings.height,
    };
    const items = walkNodes(scene.children, mode, [], ctx);
    const counts = emptyCounts();
    for (const item of items) counts[item.level] += 1;
    return {
      sceneId: scene.id,
      name: scene.name,
      counts,
      items,
    };
  });

  const totals = emptyCounts();
  for (const page of pages) {
    for (const k of Object.keys(totals) as DegradeLevel[]) {
      totals[k] += page.counts[k];
    }
  }

  return {
    schemaVersion: "1.0.0",
    mode,
    blockingErrors,
    fonts: collectFonts(doc),
    totals,
    pages,
  };
}
