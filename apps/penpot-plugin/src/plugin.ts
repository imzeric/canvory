/**
 * Penpot 插件沙箱入口。
 * `penpot` 只存在于该沙箱；UI iframe 通过消息取画板，避免把 Demo 回退当成实机导出。
 */
import {
  loadBoundSession,
  lockMountedBoard,
  mountBoard,
  removeMountedBoard,
  SESSION_KEY,
  touchMountedBoard,
} from "./assistant/session-controller.js";
import { isUserArtboard, rasterizeShapeById, readHostBoards } from "./penpot-host.js";

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

function findShape(page: PluginPenpot["currentPage"], id: string): PluginShape | null {
  return page?.getShapeById?.(id) ?? page?.findShapes?.({}).find((shape) => shape.id === id) ?? null;
}

function shapeName(page: PluginPenpot["currentPage"], id: string): string {
  return findShape(page, id)?.name ?? id;
}

function assistantSnapshot(penpotApi: PluginPenpot, selectionIds: string[]) {
  const file = penpotApi.currentFile;
  const page = penpotApi.currentPage;
  const store = {
    fileId: file?.id ?? null,
    pageId: page?.id ?? null,
    selectionIds,
    getData: () => (file?.id ? file.getPluginData?.(SESSION_KEY) ?? null : null),
    setData: (value: string) => {
      if (file?.id) file.setPluginData?.(SESSION_KEY, value);
    },
    boardExists: (id: string) => {
      const shape = findShape(page, id);
      return Boolean(shape && isUserArtboard(shape));
    },
  };
  return {
    store,
    payload: {
      session: loadBoundSession(store),
      selectionIds,
      persistence: file?.id ? ("file" as const) : ("unavailable" as const),
    },
  };
}

if (penpot?.ui?.open && penpot.ui.sendMessage && penpot.ui.onMessage) {
  const send = penpot.ui.sendMessage.bind(penpot.ui);
  let selectionIds = (penpot.selection ?? []).map((shape) => shape.id).filter((id): id is string => Boolean(id));
  penpot.ui.open("Canvory PPTX Export", `?theme=${penpot.theme ?? "light"}`, {
    width: 440,
    height: 760,
  });
  const publish = () => {
    send({
      source: SOURCE_HOST,
      type: "assistant",
      payload: assistantSnapshot(penpot, selectionIds).payload,
    });
  };
  penpot.on?.("selectionchange", (value) => {
    selectionIds = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    publish();
  });
  const readSelection = () =>
    (penpot.selection ?? []).map((shape) => shape.id).filter((id): id is string => Boolean(id));
  penpot.on?.("filechange", () => {
    selectionIds = readSelection();
    publish();
  });
  penpot.on?.("pagechange", () => {
    selectionIds = readSelection();
    publish();
  });
  penpot.on?.("finish", () => {
    selectionIds = [];
    publish();
  });

  penpot.ui.onMessage((raw) => {
    const message = raw as UiMessage;
    if (message?.source !== SOURCE_UI || !message.requestId) return;
    if (message.type === "assistant:load") {
      send({
        source: SOURCE_HOST,
        type: "assistant",
        requestId: message.requestId,
        payload: assistantSnapshot(penpot, selectionIds).payload,
      });
      return;
    }
    if (
      (message.type === "assistant:mount" ||
        message.type === "assistant:unmount" ||
        message.type === "assistant:lock" ||
        message.type === "assistant:write") &&
      message.boardId
    ) {
      const view = assistantSnapshot(penpot, selectionIds);
      const staleFile = !view.store.fileId || message.fileId !== view.store.fileId;
      const result = staleFile
        ? {
            session: view.payload.session,
            selectionIds,
            write: { ok: false, reason: "NOT_IN_FILE" },
          }
        : message.type === "assistant:mount"
          ? mountBoard(view.store, message.boardId, shapeName(penpot.currentPage, message.boardId))
          : message.type === "assistant:unmount"
            ? removeMountedBoard(view.store, message.boardId)
            : message.type === "assistant:lock"
              ? lockMountedBoard(view.store, message.boardId, message.locked === true)
              : touchMountedBoard(view.store, {
                  fileId: message.fileId ?? "",
                  pageId: message.pageId ?? "",
                  boardId: message.boardId,
                  expectedRevision: message.expectedRevision ?? -1,
                });
      send({
        source: SOURCE_HOST,
        type: "assistant",
        requestId: message.requestId,
        payload: {
          session: result.session,
          selectionIds,
          persistence: view.payload.persistence,
          write: result.write,
        },
      });
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
