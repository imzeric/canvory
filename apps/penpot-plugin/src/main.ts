/**
 * Penpot plugin 入口（T023）
 * 真实宿主中通过 penpot API 读取 boards；此处导出可测试的串联流水线。
 */
import { extractDocument, type PenpotExtractInput } from "@canvory/adapter-penpot";
import { assertUniformSceneSizes, preflight, type ExportMode } from "@canvory/core";
import { buildPptx } from "@canvory/exporter-pptx";

export interface PluginExportRequest {
  input: PenpotExtractInput;
  mode?: ExportMode;
  sceneIds?: string[] | "all";
  signal?: AbortSignal;
}

export async function runBrowserExport(req: PluginExportRequest): Promise<{
  buffer: Buffer;
  report: ReturnType<typeof preflight>;
}> {
  if (req.signal?.aborted) {
    throw new Error("已取消");
  }
  // 布局稳定：宿主应在调用前等待 Penpot 布局；此处占位
  await Promise.resolve();

  const cdm = extractDocument(req.input);
  const scope = { sceneIds: req.sceneIds ?? ("all" as const) };
  assertUniformSceneSizes(cdm, scope.sceneIds);

  const mode = req.mode ?? "auto";
  const report = preflight(cdm, mode, scope);
  if (report.blockingErrors.length) {
    throw new Error(report.blockingErrors.map((e) => e.messageZh).join("; "));
  }
  if (req.signal?.aborted) {
    throw new Error("已取消");
  }

  const result = await buildPptx(cdm, { mode, scope });
  if (req.signal?.aborted) {
    throw new Error("已取消");
  }
  return result;
}

// Penpot 插件宿主入口见 src/plugin.ts。此模块保持可导入，不在 UI 包里打开面板。
export const PLUGIN_READY = true;
