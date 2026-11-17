/**
 * Penpot 插件沙箱入口。
 * `penpot` 只存在于该沙箱；UI iframe 通过消息取画板，避免把 Demo 回退当成实机导出。
 */
import { readHostBoards, rasterizeShapeById } from "./penpot-host.js";

const SOURCE_UI = "canvory-ui";
const SOURCE_HOST = "canvory-host";

type PluginPenpot = {
  theme?: string;
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
  widthPx?: number;
  heightPx?: number;
};

const penpot = (globalThis as { penpot?: PluginPenpot }).penpot;

if (penpot?.ui?.open && penpot.ui.sendMessage && penpot.ui.onMessage) {
  const send = penpot.ui.sendMessage.bind(penpot.ui);
  penpot.ui.open("Canvory PPTX Export", `?theme=${penpot.theme ?? "light"}`, {
    width: 440,
    height: 760,
  });

  penpot.ui.onMessage((raw) => {
    const message = raw as UiMessage;
    if (message?.source !== SOURCE_UI || !message.requestId) return;
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
