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
  widthPx?: number;
  heightPx?: number;
};

const penpot = (globalThis as { penpot?: PluginPenpot }).penpot;

if (penpot?.ui?.open && penpot.ui.sendMessage && penpot.ui.onMessage) {
  const send = penpot.ui.sendMessage.bind(penpot.ui);
  const runtime = createAssistantRuntime(penpot, send);
  let writingFixture = false;
  penpot.on?.("shapechange", (value) => {
    if (writingFixture || !Array.isArray(value)) return;
    for (const id of value) {
      if (typeof id !== "string") continue;
      const shape = penpot.currentPage?.getShapeById?.(id) as {
        id?: string;
        type?: string;
        parent?: { id?: string; type?: string; getPluginData?: (key: string) => string | null; setPluginData?: (key: string, value: string) => void } | null;
        getPluginData?: (key: string) => string | null;
        setPluginData?: (key: string, value: string) => void;
      } | null;
      const board = shape?.type === "board" || shape?.type === "frame" ? shape : shape?.parent;
      if (!board?.id || !runtime.gate().mounted.includes(board.id) || !board.getPluginData || !board.setPluginData) continue;
      const next = readBoardRevision(board.getPluginData("canvory.board-rev")) + 1;
      board.setPluginData("canvory.board-rev", String(next));
    }
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
    if (message.type === "assistant:fixture" || message.type === "assistant:fixture-edit") {
      const gate = runtime.gate();
      const shape = (id: string) => penpot.currentPage?.getShapeById?.(id) as { getPluginData?: (key: string) => string | null } | null;
      writingFixture = true;
      let outcomes;
      try {
      outcomes = drawWithPenpot(penpot as never, message.type === "assistant:fixture" ? fixtureCreateOps() : fixtureEditOps(gate.mounted), {
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
        boardRevision: (id: string) => readBoardRevision(shape(id)?.getPluginData?.("canvory.board-rev")),
      });
      } finally {
        writingFixture = false;
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
          notice: `${FIXTURE_LABEL}：${outcomes.map((item) => `${item.name} ${item.status}`).join("，")}`,
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
