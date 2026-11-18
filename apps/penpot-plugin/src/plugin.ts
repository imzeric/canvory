/**
 * Penpot 插件沙箱入口。
 * `penpot` 只存在于该沙箱；UI iframe 通过消息取画板，避免把 Demo 回退当成实机导出。
 */
import { createAssistantRuntime } from "./assistant/assistant-runtime.js";
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
