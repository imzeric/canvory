import { useCallback, useEffect, useRef, useState } from "react";
import { extractDocument } from "@canvory/adapter-penpot";
import type { CanvoryDocument } from "@canvory/document-model";
import { AssistantPanel } from "./AssistantPanel.js";
import { ExportPanel } from "./ExportPanel.js";
import { PreflightPanel } from "./PreflightPanel.js";
import type { HostExtractResult } from "../penpot-host.js";
import {
  citeAssistant,
  listenAssistant,
  loadAssistant,
  loadHostBoards,
  lockAssistantMount,
  mountAssistant,
  removeAssistantMount,
  type AssistantSnapshot,
} from "./host-client.js";
import { apiFetch, createMaterial, materialRetentionMessage, requestGeneration, saveDocument } from "../api.js";

export function App() {
  const [tab, setTab] = useState<"export" | "preflight" | "assistant">("assistant");
  const [assistant, setAssistant] = useState<AssistantSnapshot | null>(null);
  const [host, setHost] = useState<HostExtractResult | null>(null);
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [saveHint, setSaveHint] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
  const sessionQueue = useRef(Promise.resolve());

  const enqueueSession = useCallback((run: () => Promise<AssistantSnapshot>) => {
    sessionQueue.current = sessionQueue.current.then(run).then(setAssistant).catch(() => undefined);
  }, []);

  const refreshHost = useCallback(async () => {
    const latest = await loadHostBoards();
    setHost(latest);
    return latest;
  }, []);

  useEffect(() => {
    void refreshHost();
    void loadAssistant().then(setAssistant);
    return listenAssistant(setAssistant);
  }, [refreshHost]);

  const boards = (host?.boards ?? []).map((b) => ({ id: b.id, name: b.name }));

  async function extractCdm(
    sceneIds: string[] | "all",
    sort: "position" | "name" = "position",
  ): Promise<CanvoryDocument> {
    const latest = await loadHostBoards();
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
        <button type="button" onClick={() => setTab("assistant")}>
          助手
        </button>
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
          {host.source === "penpot" ? "宿主: Penpot" : `宿主: Demo 回退 (${host.source})`}
          {documentId ? ` · doc ${documentId.slice(0, 8)}` : ""}
          {saveHint ? ` · ${saveHint}` : ""}
        </span>
      </nav>
      {tab === "assistant" ? (
        <AssistantPanel
          selectionIds={assistant?.selectionIds ?? []}
          mounts={assistant?.session.mounts ?? []}
          persistence={assistant?.persistence ?? "unavailable"}
          canWrite={assistant?.acceptingWrites === true}
          materialIds={assistant?.session.materialIds ?? []}
          notice={generationNotice}
          onGenerate={(demand) => {
            const fileId = assistant?.session.fileId;
            if (!fileId) {
              setGenerationNotice("当前不在 Penpot 文件中，不能生成。");
              return;
            }
            void requestGeneration({
              fileId,
              demand,
              materialIds: assistant?.session.materialIds ?? [],
            })
              .then((result) => setGenerationNotice(result.message))
              .catch(() => setGenerationNotice("没有绘制画板。"));
          }}
          onCite={(text) => {
            const fileId = assistant?.session.fileId;
            const writeEpoch = assistant?.writeEpoch;
            if (!fileId || !text || assistant?.acceptingWrites !== true || writeEpoch === undefined) return;
            void createMaterial({ fileId, text }).then((saved) => {
              setGenerationNotice(materialRetentionMessage(saved.persistent));
              enqueueSession(() => citeAssistant(saved.id, fileId, writeEpoch));
            });
          }}
          onMount={(id) => {
            const fileId = assistant?.session.fileId;
            const writeEpoch = assistant?.writeEpoch;
            if (!fileId || assistant?.acceptingWrites !== true || writeEpoch === undefined) return;
            enqueueSession(() => mountAssistant(id, fileId, writeEpoch));
          }}
          onRemove={(id) => {
            const fileId = assistant?.session.fileId;
            const writeEpoch = assistant?.writeEpoch;
            if (!fileId || assistant?.acceptingWrites !== true || writeEpoch === undefined) return;
            enqueueSession(() => removeAssistantMount(id, fileId, writeEpoch));
          }}
          onLock={(id, locked) => {
            const fileId = assistant?.session.fileId;
            const writeEpoch = assistant?.writeEpoch;
            if (!fileId || assistant?.acceptingWrites !== true || writeEpoch === undefined) return;
            enqueueSession(() => lockAssistantMount(id, fileId, locked, writeEpoch));
          }}
        />
      ) : tab === "export" ? (
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
