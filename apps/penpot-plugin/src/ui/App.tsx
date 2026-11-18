import { useCallback, useEffect, useRef, useState } from "react";
import { extractDocument } from "@canvory/adapter-penpot";
import type { CanvoryDocument } from "@canvory/document-model";
import { AssistantPanel } from "./AssistantPanel.js";
import { ExportPanel } from "./ExportPanel.js";
import { PreflightPanel } from "./PreflightPanel.js";
import type { HostExtractResult } from "../penpot-host.js";
import {
  citeAssistant,
  applyValidatedOps,
  listenAssistant,
  readBoardRevisions,
  runFixture,
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
  const [pendingOps, setPendingOps] = useState<unknown[]>([]);
  const [pendingRevisions, setPendingRevisions] = useState<Record<string, number>>({});
  const [generationBusy, setGenerationBusy] = useState(false);
  const generationAbort = useRef<AbortController | null>(null);
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
    return listenAssistant((snapshot) => {
      setAssistant(snapshot);
      if (snapshot.notice) setGenerationNotice(snapshot.notice);
    });
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
    return (
      <p style={{ padding: 12, background: "#f4f7f6", color: "#1c2422", fontFamily: '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        正在读取画板…
      </p>
    );
  }

  return (
    <div style={{ background: "#f4f7f6", color: "#1c2422", minHeight: "100%" }}>
      <nav style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #d5ddd9", fontFamily: '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        {(
          [
            ["assistant", "助手"],
            ["export", "导出"],
            ["preflight", "预检"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
            style={{
              font: "inherit",
              fontSize: 14,
              padding: "6px 10px",
              borderRadius: 2,
              border: "1px solid #c5d4ce",
              background: tab === id ? "#0c6e64" : "#ffffff",
              color: tab === id ? "#f7fffc" : "#1c2422",
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {saveHint ? (
        <p role="status" style={{ margin: 0, padding: "4px 12px", fontSize: 12, color: "#3e524c" }}>
          {saveHint}
        </p>
      ) : null}
      {tab === "assistant" ? (
        <AssistantPanel
          selectionIds={assistant?.selectionIds ?? []}
          mounts={assistant?.session.mounts ?? []}
          persistence={assistant?.persistence ?? "unavailable"}
          canWrite={assistant?.acceptingWrites === true}
          materialIds={assistant?.session.materialIds ?? []}
          notice={generationNotice}
          busy={generationBusy}
          canDraw={pendingOps.length > 0 && assistant?.acceptingWrites === true}
          onCancel={() => {
            generationAbort.current?.abort();
            setGenerationBusy(false);
            setGenerationNotice("已停止。没有绘制。");
          }}
          onDraw={() => {
            if (!pendingOps.length || assistant?.acceptingWrites !== true) return;
            const ops = pendingOps;
            setPendingOps([]);
            void applyValidatedOps(ops, pendingRevisions).then((snapshot) => {
              setAssistant(snapshot);
              setGenerationNotice(snapshot.notice ?? "宿主没有返回绘制结果。");
            });
          }}
          onGenerate={(demand) => {
            const fileId = assistant?.session.fileId;
            if (!fileId) {
              setGenerationNotice("当前不在 Penpot 文件中，不能生成。");
              return;
            }
            const controller = new AbortController();
            generationAbort.current = controller;
            setGenerationBusy(true);
            void requestGeneration(
              {
                fileId,
                demand,
                materialIds: assistant?.session.materialIds ?? [],
              },
              controller.signal,
            )
              .then(async (result) => {
                if (controller.signal.aborted) return;
                const revisions = await readBoardRevisions().catch(() => ({}));
                setPendingRevisions(revisions);
                setPendingOps(result.ops);
                const revisionText = Object.entries(revisions)
                  .map(([id, revision]) => `${id.slice(0, 8)}=${revision}`)
                  .join("，");
                setGenerationNotice(
                  `${result.message}${revisionText ? ` 当时挂载修订：${revisionText}。` : ""}`,
                );
              })
              .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setPendingOps([]);
                setGenerationNotice(error instanceof Error ? "没有完成校验，没有绘制。" : "没有完成校验，没有绘制。");
              })
              .finally(() => {
                if (generationAbort.current === controller) setGenerationBusy(false);
              });
          }}
          onFixture={(kind) => {
            void runFixture(kind, kind === "edit" ? pendingRevisions : undefined).then((snapshot) => {
              setAssistant(snapshot);
              if (snapshot.notice) setGenerationNotice(snapshot.notice);
            });
          }}
          onCite={(text) => {
            const fileId = assistant?.session.fileId;
            const writeEpoch = assistant?.writeEpoch;
            if (!fileId || !text || assistant?.acceptingWrites !== true || writeEpoch === undefined) {
              setGenerationNotice("当前不能写入，没有引用。");
              return;
            }
            void createMaterial({ fileId, text })
              .then((saved) => {
                setGenerationNotice(materialRetentionMessage(saved.persistent));
                enqueueSession(() => citeAssistant(saved.id, fileId, writeEpoch));
              })
              .catch(() => setGenerationNotice("没有引用这段文字。"));
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
