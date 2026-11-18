/**
 * Penpot 插件沙箱入口。
 * `penpot` 只存在于该沙箱；UI iframe 通过消息取画板，避免把 Demo 回退当成实机导出。
 */
import { createAssistantRuntime } from "./assistant/assistant-runtime.js";
import { drawWithPenpot, fixtureCreateOps, fixtureEditOps, FIXTURE_LABEL } from "./assistant/penpot-draw.js";
import { readBoardRevision } from "@canvory/core";
import { rasterizeShapeById, readHostBoards } from "./penpot-host.js";

const SOURCE_UI = "canvory-ui";
const SOURCE_HOST = "canvory-host";

type PluginShape = { id?: string; name?: string; type?: string };
type PluginPenpot = {
  theme?: string;
  selection?: PluginShape[];
  currentFile?: {
    id?: string;
    getPluginData?: (key: string) => string | null;
    setPluginData?: (key: string, value: string) => void;
  } | null;
  currentPage?: {
    id?: string;
    getShapeById?: (id: string) => PluginShape | null;
    findShapes?: (query: object) => PluginShape[];
  } | null;
  on?: (event: string, callback: (value: unknown) => void) => void;
  history?: { undoBlockBegin(): symbol; undoBlockFinish(id: symbol): void };
  createBoard?: () => { id: string; name: string; x: number; y: number; resize(width: number, height: number): void; appendChild(child: { id: string }): void; getPluginData(key: string): string | null; setPluginData(key: string, value: string): void };
  createText?: (text: string) => { id: string; name: string; x: number; y: number; resize(width: number, height: number): void; appendChild(child: { id: string }): void; getPluginData(key: string): string | null; setPluginData(key: string, value: string): void };
  createRectangle?: () => { id: string; name: string; x: number; y: number; resize(width: number, height: number): void; appendChild(child: { id: string }): void; getPluginData(key: string): string | null; setPluginData(key: string, value: string): void };
  createEllipse?: () => { id: string; name: string; x: number; y: number; resize(width: number, height: number): void; appendChild(child: { id: string }): void; getPluginData(key: string): string | null; setPluginData(key: string, value: string): void };
  ui?: {
    open?: (title: string, url: string, options?: { width?: number; height?: number }) => void;
    sendMessage?: (message: unknown) => void;
    onMessage?: (handler: (message: unknown) => void) => void;
  };
};

type UiMessage = {
  source?: string;
  type?: string;
  requestId?: string;
  nodeId?: string;
  boardId?: string;
  fileId?: string;
  pageId?: string;
  locked?: boolean;
  expectedRevision?: number;
  ops?: unknown;
  boardRevisions?: Record<string, number>;
  widthPx?: number;
  heightPx?: number;
};

const penpot = (globalThis as { penpot?: PluginPenpot }).penpot;

if (penpot?.ui?.open && penpot.ui.sendMessage && penpot.ui.onMessage) {
  const send = penpot.ui.sendMessage.bind(penpot.ui);
  const runtime = createAssistantRuntime(penpot, send);
  let writingFixture = false;
  const externalEdits = new Map<string, number>();
  const liveBoardRevision = (id: string) => {
    const stored = readBoardRevision(
      (penpot.currentPage?.getShapeById?.(id) as { getPluginData?: (key: string) => string | null } | null)?.getPluginData?.(
        "canvory.board-rev",
      ),
    );
    return stored + (externalEdits.get(id) ?? 0);
  };
  penpot.on?.("shapechange", (value) => {
    if (writingFixture || !value || typeof value !== "object" || Array.isArray(value)) return;
    const shape = value as {
      id?: string;
      type?: string;
      parent?: {
        id?: string;
        type?: string;
        parent?: unknown;
        getPluginData?: (key: string) => string | null;
        setPluginData?: (key: string, value: string) => void;
      } | null;
      getPluginData?: (key: string) => string | null;
      setPluginData?: (key: string, value: string) => void;
    };
    let current: typeof shape | null = shape;
    let board: typeof shape | null = null;
    for (let depth = 0; current && depth < 8; depth += 1) {
      if (current.type === "board" || current.type === "frame") board = current;
      current = (current.parent as typeof shape | null) ?? null;
    }
    if (!board?.id || !runtime.gate().mounted.includes(board.id)) return;
    externalEdits.set(board.id, (externalEdits.get(board.id) ?? 0) + 1);
  });
  penpot.ui.open("Canvory PPTX Export", `?theme=${penpot.theme ?? "light"}`, {
    width: 440,
    height: 760,
  });
  penpot.on?.("selectionchange", (value) => runtime.emit("selectionchange", value));
  penpot.on?.("filechange", () => runtime.emit("filechange"));
  penpot.on?.("pagechange", () => runtime.emit("pagechange"));
  penpot.on?.("finish", () => runtime.emit("finish"));

  penpot.ui.onMessage((raw) => {
    const message = raw as UiMessage;
    if (message?.source !== SOURCE_UI || !message.requestId) return;
    if (message.type === "assistant:board-revisions") {
      const gate = runtime.gate();
      const boardRevisions: Record<string, number> = {};
      for (const boardId of gate.mounted) {
        boardRevisions[boardId] = liveBoardRevision(boardId);
      }
      send({
        source: SOURCE_HOST,
        type: "assistant",
        requestId: message.requestId,
        payload: {
          session: gate.session,
          selectionIds: [],
          persistence: gate.fileId ? "file" : "unavailable",
          writeEpoch: gate.epoch,
          acceptingWrites: gate.accepting,
          boardRevisions,
        },
      });
      return;
    }
    if (message.type === "assistant:fixture" || message.type === "assistant:fixture-edit" || message.type === "assistant:apply") {
      const gate = runtime.gate();
      const ops =
        message.type === "assistant:apply"
          ? message.ops
          : message.type === "assistant:fixture"
            ? fixtureCreateOps()
            : fixtureEditOps(gate.mounted);
      writingFixture = true;
      let outcomes;
      try {
        outcomes = drawWithPenpot(penpot as never, ops as never, {
          expectedFileId: gate.fileId ?? "",
          expectedPageId: gate.pageId ?? "",
          expectedEpoch: gate.epoch,
          fileId: () => penpot.currentFile?.id ?? null,
          pageId: () => penpot.currentPage?.id ?? null,
          epoch: () => runtime.gate().epoch,
          accepting: () => runtime.gate().accepting,
          mounted: () => runtime.gate().mounted,
          locked: () => runtime.gate().locked,
          cancelled: () => false,
          boardRevision: (id: string) => liveBoardRevision(id),
          expectedBoardRevision: message.boardRevisions,
        });
      } finally {
        setTimeout(() => {
          writingFixture = false;
        }, 0);
      }
      const failed = outcomes.some((item) => item.status === "failed");
      const prefix = message.type === "assistant:apply" ? "传输结果，不是外部模型验收" : FIXTURE_LABEL;
      const recovery = failed ? "失败的画板可能仍留在画布上，请用 Penpot 撤销该页。插件不能自动回滚。" : "";
      send({
        source: SOURCE_HOST,
        type: "assistant",
        requestId: message.requestId,
        payload: {
          session: gate.session,
          selectionIds: [],
          persistence: gate.fileId ? "file" : "unavailable",
          writeEpoch: gate.epoch,
          acceptingWrites: gate.accepting,
          notice: `${prefix}：${outcomes.map((item) => `${item.name} ${item.status}`).join("，")}。${recovery}`,
        },
      });
      return;
    }
    if (message.type?.startsWith("assistant:")) {
      runtime.handle(raw);
      return;
    }
    if (message.type === "refresh") {
      void readHostBoards().then((payload) => {
        send({
          source: SOURCE_HOST,
          type: "boards",
          requestId: message.requestId,
          payload,
        });
      });
      return;
    }
    if (message.type === "rasterize" && message.nodeId) {
      void rasterizeShapeById(message.nodeId, {
        widthPx: message.widthPx,
        heightPx: message.heightPx,
      }).then((payload) => {
        send({
          source: SOURCE_HOST,
          type: "raster",
          requestId: message.requestId,
          payload,
        });
      });
    }
  });
}
