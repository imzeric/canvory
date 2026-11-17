import { useState } from "react";
import type { CanvoryDocument } from "@canvory/document-model";
import { preflight, type ExportMode, type ExportReport } from "@canvory/core";

interface Props {
  getDocument: () => Promise<CanvoryDocument>;
  mode?: ExportMode;
}

export function PreflightPanel({ getDocument, mode = "auto" }: Props) {
  const [report, setReport] = useState<ExportReport | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try {
      const doc = await getDocument();
      setReport(preflight(doc, mode));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preflight-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 12, fontSize: 13 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>导出预检</h2>
      <button type="button" onClick={() => void run()}>
        运行预检
      </button>
      {report ? (
        <>
          <button type="button" onClick={downloadJson} style={{ marginLeft: 8 }}>
            下载 JSON 报告
          </button>
          <p>
            合计 L0={report.totals.L0} L1={report.totals.L1} L2={report.totals.L2}{" "}
            L3={report.totals.L3}
          </p>
          {report.blockingErrors.length > 0 ? (
            <ul style={{ color: "#b00020" }}>
              {report.blockingErrors.map((e) => (
                <li key={e.code}>
                  {e.code}: {e.messageZh}
                </li>
              ))}
            </ul>
          ) : null}
          {report.fonts.length > 0 ? (
            <div>
              <strong>字体映射提示</strong>
              <ul>
                {report.fonts.map((f) => (
                  <li key={f.sourceFamily}>
                    {f.sourceFamily} → {f.targetFamily}：{f.installHintZh}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.pages.map((p) => (
            <div key={p.sceneId} style={{ marginTop: 8 }}>
              <strong>{p.name}</strong>
              <div>
                L0={p.counts.L0} L1={p.counts.L1} L2={p.counts.L2} L3={p.counts.L3}
              </div>
              <ul>
                {p.items
                  .filter((i) => i.level !== "L0")
                  .map((i) => (
                    <li key={i.nodeId}>
                      [{i.level}] {i.messageZh}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </>
      ) : null}
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
    </div>
  );
}
