import { useEffect, useRef, useState } from "react";
import type { ExportMode, ExportReport, RasterizeFn } from "@canvory/core";
import type { CanvoryDocument } from "@canvory/document-model";
import { buildPptx } from "@canvory/exporter-pptx";
import { preflight } from "@canvory/core";
import {
  BROWSER_EXPORT_HINT_MS,
  PAGE_SOFT_LIMIT,
  cancelTask,
  createBackgroundTask,
  pollTask,
} from "../api.js";
import { isPenpotHost, rasterizeShapeById } from "../penpot-host.js";

export interface BoardOption {
  id: string;
  name: string;
}

interface Props {
  boards: BoardOption[];
  extractCdm: (
    sceneIds: string[] | "all",
    sort?: "position" | "name",
  ) => Promise<CanvoryDocument>;
  documentId?: string;
  /** 后台导出前确保已保存并返回 documentId */
  ensureDocumentId?: (
    sceneIds: string[] | "all",
    sort: "position" | "name",
  ) => Promise<string>;
}

function downloadBlob(buf: ArrayBuffer | Buffer | Uint8Array, filename: string) {
  const part =
    buf instanceof ArrayBuffer
      ? buf
      : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const blob = new Blob([part as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadReport(report: ExportReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "export-report.json";
  a.click();
  URL.revokeObjectURL(url);
}

const hostRasterize: RasterizeFn = async (req) => {
  if (!isPenpotHost()) return null;
  return rasterizeShapeById(req.nodeId, {
    widthPx: req.widthPx,
    heightPx: req.heightPx,
  });
};

export function ExportPanel({
  boards,
  extractCdm,
  documentId,
  ensureDocumentId,
}: Props) {
  const [selected, setSelected] = useState<string[]>(boards.map((b) => b.id));
  const [mode, setMode] = useState<ExportMode>("auto");
  const [sort, setSort] = useState<"position" | "name">("position");
  const [useBackground, setUseBackground] = useState(
    boards.length > PAGE_SOFT_LIMIT,
  );
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [lastReport, setLastReport] = useState<ExportReport | null>(null);
  const cancelled = useRef(false);
  const hintTimer = useRef<number | null>(null);
  const activeTaskId = useRef<string | null>(null);

  useEffect(() => {
    setSelected(boards.map((b) => b.id));
  }, [boards]);

  useEffect(() => {
    setUseBackground(selected.length > PAGE_SOFT_LIMIT);
  }, [selected.length]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onExport() {
    cancelled.current = false;
    activeTaskId.current = null;
    setError("");
    setLastReport(null);
    setProgress("准备中…");
    const scopeIds =
      selected.length === boards.length ? ("all" as const) : selected;

    try {
      if (useBackground) {
        let docId = documentId;
        if (!docId && ensureDocumentId) {
          setProgress("保存文档…");
          docId = await ensureDocumentId(scopeIds, sort);
        }
        if (!docId) {
          setError("后台导出需要先保存文档到服务端（documentId）");
          setProgress("");
          return;
        }
        setProgress("已提交后台任务…");
        const { taskId } = await createBackgroundTask({
          documentId: docId,
          mode,
          scope: { sceneIds: scopeIds, sort },
        });
        activeTaskId.current = taskId;
        for (;;) {
          if (cancelled.current) {
            setProgress("已取消");
            return;
          }
          const st = await pollTask(taskId);
          setProgress(`后台状态：${st.status}`);
          if (st.status === "succeeded" && st.downloadUrl) {
            const res = await fetch(
              st.downloadUrl.startsWith("http")
                ? st.downloadUrl
                : `http://localhost:3000${st.downloadUrl}`,
              {
                headers: {
                  Authorization: `Bearer ${import.meta.env.VITE_AUTH_TOKEN ?? "dev-token-change-me"}`,
                },
              },
            );
            if (!cancelled.current && res.ok) {
              downloadBlob(await res.arrayBuffer(), `canvory-${taskId}.pptx`);
              setProgress("下载完成");
            }
            return;
          }
          if (st.status === "failed" || st.status === "cancelled") {
            setError(st.errorMessage ?? "导出失败");
            setProgress("");
            return;
          }
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      const started = performance.now();
      hintTimer.current = window.setTimeout(() => {
        if (!cancelled.current) {
          setProgress(
            (p) =>
              `${p}（已超过 ${BROWSER_EXPORT_HINT_MS / 1000}s，可改走后台导出）`,
          );
        }
      }, BROWSER_EXPORT_HINT_MS);

      setProgress("提取画板…");
      const cdm = await extractCdm(scopeIds, sort);
      if (cancelled.current) {
        setProgress("已取消");
        return;
      }

      setProgress("预检…");
      const report = preflight(cdm, mode, { sceneIds: scopeIds, sort });
      if (report.blockingErrors.length) {
        setError(report.blockingErrors.map((e) => e.messageZh).join("；"));
        setProgress("");
        return;
      }

      setProgress("生成 PPTX…");
      const { buffer, report: exportReport } = await buildPptx(cdm, {
        mode,
        scope: { sceneIds: scopeIds, sort },
        rasterize: hostRasterize,
      });
      if (cancelled.current) {
        setProgress("已取消（未下载）");
        return;
      }

      downloadBlob(buffer, `${cdm.title || "canvory"}.pptx`);
      setLastReport(exportReport);
      const ms = Math.round(performance.now() - started);
      setProgress(`完成（${ms}ms）`);
    } catch (e) {
      if (!cancelled.current) {
        setError(e instanceof Error ? e.message : String(e));
        setProgress("");
      }
    } finally {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    }
  }

  async function onCancel() {
    cancelled.current = true;
    setProgress("取消中…");
    const tid = activeTaskId.current;
    if (tid) {
      try {
        await cancelTask(tid);
        setProgress("已取消后台任务");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 12, fontSize: 13 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>导出 PPTX</h2>

      <fieldset style={{ border: "1px solid #ddd", marginBottom: 8 }}>
        <legend>画板范围</legend>
        {boards.map((b) => (
          <label key={b.id} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={selected.includes(b.id)}
              onChange={() => toggle(b.id)}
            />{" "}
            {b.name}
          </label>
        ))}
      </fieldset>

      <label style={{ display: "block", marginBottom: 8 }}>
        排序{" "}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "position" | "name")}
        >
          <option value="position">position（画板顺序）</option>
          <option value="name">name（名称）</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        模式{" "}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ExportMode)}
        >
          <option value="auto">auto（默认）</option>
          <option value="editable">editable</option>
          <option value="fidelity">fidelity</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={useBackground}
          onChange={(e) => setUseBackground(e.target.checked)}
        />{" "}
        后台导出
        {selected.length > PAGE_SOFT_LIMIT
          ? `（已选 ${selected.length} 页，建议后台）`
          : ""}
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void onExport()}>
          导出
        </button>
        <button type="button" onClick={() => void onCancel()}>
          取消
        </button>
        {lastReport ? (
          <button type="button" onClick={() => downloadReport(lastReport)}>
            下载导出报告
          </button>
        ) : null}
      </div>

      {progress ? <p style={{ color: "#333" }}>{progress}</p> : null}
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
    </div>
  );
}
