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
