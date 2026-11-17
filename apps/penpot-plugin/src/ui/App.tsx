import { useCallback, useEffect, useState } from "react";
import { extractDocument } from "@canvory/adapter-penpot";
import type { CanvoryDocument } from "@canvory/document-model";
import { ExportPanel } from "./ExportPanel.js";
import { PreflightPanel } from "./PreflightPanel.js";
import {
  isPenpotHost,
  readHostBoards,
  type HostExtractResult,
} from "../penpot-host.js";
import { apiFetch, saveDocument } from "../api.js";

export function App() {
  const [tab, setTab] = useState<"export" | "preflight">("export");
  const [host, setHost] = useState<HostExtractResult | null>(null);
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [saveHint, setSaveHint] = useState("");

  const refreshHost = useCallback(async () => {
    const latest = await readHostBoards();
    setHost(latest);
    return latest;
  }, []);

  useEffect(() => {
    void refreshHost();
  }, [refreshHost]);

  const boards = (host?.boards ?? []).map((b) => ({ id: b.id, name: b.name }));

  async function extractCdm(
    sceneIds: string[] | "all",
    sort: "position" | "name" = "position",
  ): Promise<CanvoryDocument> {
    const latest = await readHostBoards();
    setHost(latest);
    const filtered =
      sceneIds === "all"
        ? latest.boards
        : latest.boards.filter((b) => sceneIds.includes(b.id));
    return extractDocument({
      documentId,
      title: latest.title,
      boards: filtered,
      sort,
      assets: latest.assets,
    });
  }

  async function ensureSaved(
    sceneIds: string[] | "all",
    sort: "position" | "name",
  ): Promise<string> {
    const cdm = await extractCdm(sceneIds, sort);
    if (documentId) {
      const res = await apiFetch(`/documents/${documentId}/versions`, {
        method: "POST",
        body: JSON.stringify({ content: cdm, label: "导出前快照" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return documentId;
    }
    setSaveHint("正在保存文档到服务端…");
    const created = await saveDocument({ title: cdm.title, cdm });
    setDocumentId(created.id);
    setSaveHint(`已保存：${created.id.slice(0, 8)}…`);
    return created.id;
  }

  if (!host) {
    return <p style={{ padding: 12, fontFamily: "system-ui" }}>加载画板…</p>;
  }

  return (
    <div>
      <nav style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #eee" }}>
        <button type="button" onClick={() => setTab("export")}>
          导出
        </button>
        <button type="button" onClick={() => setTab("preflight")}>
          预检
        </button>
        <button type="button" onClick={() => void refreshHost()}>
          刷新画板
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#666" }}>
          {isPenpotHost() ? `宿主: Penpot (${host.source})` : "宿主: Demo 回退"}
          {documentId ? ` · doc ${documentId.slice(0, 8)}` : ""}
          {saveHint ? ` · ${saveHint}` : ""}
        </span>
      </nav>
      {tab === "export" ? (
        <ExportPanel
          boards={boards}
          extractCdm={extractCdm}
          documentId={documentId}
          ensureDocumentId={ensureSaved}
        />
      ) : (
        <PreflightPanel getDocument={() => extractCdm("all")} />
      )}
    </div>
  );
}
