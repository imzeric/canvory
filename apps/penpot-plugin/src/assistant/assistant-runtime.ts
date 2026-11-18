import {
  loadBoundSession,
  lockMountedBoard,
  mountBoard,
  removeMountedBoard,
  SESSION_KEY,
  touchMountedBoard,
  type AssistantResult,
  type SessionStore,
} from "./session-controller.js";
import { isUserArtboard } from "../penpot-host.js";

const SOURCE_HOST = "canvory-host";

type PluginShape = { id?: string; name?: string; type?: string };

export interface AssistantHostApi {
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
}

type UiMessage = {
  source?: string;
  type?: string;
  requestId?: string;
  boardId?: string;
  fileId?: string;
  pageId?: string;
  locked?: boolean;
  expectedRevision?: number;
  writeEpoch?: number;
};

export interface AssistantRuntime {
  handle(raw: unknown): void;
  emit(event: "selectionchange" | "filechange" | "pagechange" | "finish", value?: unknown): void;
}

function findShape(page: AssistantHostApi["currentPage"], id: string): PluginShape | null {
  return page?.getShapeById?.(id) ?? page?.findShapes?.({}).find((shape) => shape.id === id) ?? null;
}

function readIds(shapes: PluginShape[] | undefined): string[] {
  return (shapes ?? []).map((shape) => shape.id).filter((id): id is string => Boolean(id));
}

function persisted(store: SessionStore, result: AssistantResult): AssistantResult {
  if (result.write && !result.write.ok) return result;
  const stored = loadBoundSession(store);
  const same =
    stored.revision === result.session.revision &&
    stored.mounts.length === result.session.mounts.length &&
    stored.mounts.every(
      (mount, index) =>
        mount.boardId === result.session.mounts[index]?.boardId && mount.locked === result.session.mounts[index]?.locked,
    );
  if (!same) {
    return { session: stored, selectionIds: result.selectionIds, write: { ok: false, reason: "NOT_PERSISTED" } };
  }
  return result;
}

export function createAssistantRuntime(api: AssistantHostApi, send: (message: unknown) => void): AssistantRuntime {
  let selectionIds = readIds(api.selection);
  let writeEpoch = 1;
  let acceptingWrites = true;

  const view = () => {
    const file = api.currentFile;
    const page = api.currentPage;
    const store: SessionStore = {
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
        writeEpoch,
        acceptingWrites,
      },
    };
  };

  const reply = (requestId: string, body: Record<string, unknown>) => {
    send({
      source: SOURCE_HOST,
      type: "assistant",
      requestId,
      payload: { ...body, writeEpoch, acceptingWrites },
    });
  };

  return {
    emit(event, value) {
      if (event === "selectionchange") {
        selectionIds = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : readIds(api.selection);
      } else if (event === "finish") {
        acceptingWrites = false;
        writeEpoch += 1;
        selectionIds = [];
      } else {
        acceptingWrites = event === "filechange" ? true : acceptingWrites;
        writeEpoch += 1;
        selectionIds = readIds(api.selection);
      }
      send({ source: SOURCE_HOST, type: "assistant", payload: view().payload });
    },
    handle(raw) {
      const message = raw as UiMessage;
      if (message?.source !== "canvory-ui" || !message.requestId) return;
      if (message.type === "assistant:load") {
        reply(message.requestId, view().payload);
        return;
      }
      if (
        (message.type === "assistant:mount" ||
          message.type === "assistant:unmount" ||
          message.type === "assistant:lock" ||
          message.type === "assistant:write") &&
        message.boardId
      ) {
        const current = view();
        if (!acceptingWrites) {
          reply(message.requestId, {
            session: current.payload.session,
            selectionIds,
            persistence: current.payload.persistence,
            write: { ok: false, reason: "SESSION_CLOSED" },
          });
          return;
        }
        if (message.writeEpoch !== writeEpoch) {
          reply(message.requestId, {
            session: current.payload.session,
            selectionIds,
            persistence: current.payload.persistence,
            write: { ok: false, reason: "STALE_SESSION" },
          });
          return;
        }
        const staleFile = !current.store.fileId || message.fileId !== current.store.fileId;
        const result = staleFile
          ? {
              session: current.payload.session,
              selectionIds,
              write: { ok: false, reason: "NOT_IN_FILE" },
            }
          : message.type === "assistant:mount"
            ? persisted(
                current.store,
                mountBoard(current.store, message.boardId, findShape(api.currentPage, message.boardId)?.name ?? message.boardId),
              )
            : message.type === "assistant:unmount"
              ? persisted(current.store, removeMountedBoard(current.store, message.boardId))
              : message.type === "assistant:lock"
                ? persisted(current.store, lockMountedBoard(current.store, message.boardId, message.locked === true))
                : touchMountedBoard(current.store, {
                    fileId: message.fileId ?? "",
                    pageId: message.pageId ?? "",
                    boardId: message.boardId,
                    expectedRevision: message.expectedRevision ?? -1,
                  });
        reply(message.requestId, {
          session: result.session,
          selectionIds,
          persistence: current.payload.persistence,
          write: result.write,
        });
      }
    },
  };
}
