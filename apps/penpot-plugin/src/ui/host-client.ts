import {
  isPenpotHost,
  rasterizeShapeById,
  readHostBoards,
  type HostExtractResult,
} from "../penpot-host.js";

const SOURCE_UI = "canvory-ui";
const SOURCE_HOST = "canvory-host";

function inPluginFrame(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

function requestHost<T>(message: Record<string, unknown>, expect: string): Promise<T> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Penpot 插件桥接超时"));
    }, 8000);
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { source?: string; type?: string; requestId?: string; payload?: T };
      if (!data || data.source !== SOURCE_HOST || data.type !== expect || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.payload as T);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ ...message, source: SOURCE_UI, requestId }, "*");
  });
}

export interface AssistantSnapshot {
  session: {
    fileId: string;
    pageId: string;
    revision: number;
    mounts: { boardId: string; name: string; locked: boolean }[];
    materialIds: string[];
  };
  selectionIds: string[];
  persistence: "file" | "unavailable";
  writeEpoch: number;
  acceptingWrites: boolean;
  notice?: string;
  boardRevisions?: Record<string, number>;
}

export async function loadAssistant(): Promise<AssistantSnapshot> {
  if (!inPluginFrame()) {
    return {
      session: { fileId: "", pageId: "", revision: 0, mounts: [], materialIds: [] },
      selectionIds: [],
      persistence: "unavailable",
      writeEpoch: 0,
      acceptingWrites: false,
    };
  }
  return requestHost<AssistantSnapshot>({ type: "assistant:load" }, "assistant");
}

export async function mountAssistant(boardId: string, fileId: string, writeEpoch: number): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>({ type: "assistant:mount", boardId, fileId, writeEpoch }, "assistant");
}

export async function removeAssistantMount(boardId: string, fileId: string, writeEpoch: number): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>({ type: "assistant:unmount", boardId, fileId, writeEpoch }, "assistant");
}

export async function readBoardRevisions(): Promise<Record<string, number>> {
  const snapshot = await requestHost<AssistantSnapshot & { boardRevisions?: Record<string, number> }>(
    { type: "assistant:board-revisions" },
    "assistant",
  );
  return snapshot.boardRevisions ?? {};
}

export async function applyValidatedOps(ops: unknown[], boardRevisions: Record<string, number>): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>({ type: "assistant:apply", ops, boardRevisions }, "assistant");
}

export async function runFixture(kind: "create" | "edit", boardRevisions?: Record<string, number>): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>(
    { type: kind === "create" ? "assistant:fixture" : "assistant:fixture-edit", boardRevisions },
    "assistant",
  );
}

export async function citeAssistant(materialId: string, fileId: string, writeEpoch: number): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>({ type: "assistant:cite", materialId, fileId, writeEpoch }, "assistant");
}

export async function lockAssistantMount(
  boardId: string,
  fileId: string,
  locked: boolean,
  writeEpoch: number,
): Promise<AssistantSnapshot> {
  return requestHost<AssistantSnapshot>({ type: "assistant:lock", boardId, fileId, locked, writeEpoch }, "assistant");
}

export function listenAssistant(onChange: (snapshot: AssistantSnapshot) => void): () => void {
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as { source?: string; type?: string; payload?: AssistantSnapshot };
    if (data?.source === SOURCE_HOST && data.type === "assistant" && data.payload) onChange(data.payload);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export async function loadHostBoards(): Promise<HostExtractResult> {
  if (isPenpotHost() || !inPluginFrame()) return readHostBoards();
  try {
    return await requestHost<HostExtractResult>({ type: "refresh" }, "boards");
  } catch {
    return readHostBoards();
  }
}

export async function rasterizeFromHost(req: {
  nodeId: string;
  widthPx: number;
  heightPx: number;
}): Promise<{ nodeId: string; mimeType: "image/png"; data: string } | null> {
  if (isPenpotHost()) {
    return rasterizeShapeById(req.nodeId, { widthPx: req.widthPx, heightPx: req.heightPx });
  }
  if (!inPluginFrame()) return null;
  try {
    return await requestHost({ type: "rasterize", ...req }, "raster");
  } catch {
    return null;
  }
}
