import {
  addMaterial,
  addMount,
  allowWrite,
  parseFileSession,
  removeMount,
  sessionForFile,
  setMountLocked,
  type FileSession,
} from "@canvory/core";

export const SESSION_KEY = "canvory.mounts";

export interface CapturedWrite {
  fileId: string;
  pageId: string;
  boardId: string;
  expectedRevision: number;
}

export interface SessionStore {
  fileId: string | null;
  pageId: string | null;
  selectionIds: string[];
  getData(): string | null;
  setData(value: string): void;
  boardExists(boardId: string): boolean;
}

export interface AssistantResult {
  session: FileSession;
  selectionIds: string[];
  write?: { ok: boolean; reason: string };
}

function emptySession(): FileSession {
  return { fileId: "", pageId: "", revision: 0, mounts: [], materialIds: [] };
}

export function loadBoundSession(store: SessionStore): FileSession {
  if (!store.fileId || !store.pageId) return emptySession();
  const raw = store.getData();
  if (!raw) return sessionForFile(null, store.fileId, store.pageId);
  try {
    return sessionForFile(parseFileSession(JSON.parse(raw) as unknown), store.fileId, store.pageId);
  } catch {
    return sessionForFile(null, store.fileId, store.pageId);
  }
}

function save(store: SessionStore, session: FileSession): void {
  if (store.fileId !== session.fileId) return;
  store.setData(JSON.stringify(session));
}

export function mountBoard(store: SessionStore, boardId: string, name: string): AssistantResult {
  const session = loadBoundSession(store);
  if (!store.fileId || session.fileId !== store.fileId) {
    return { session, selectionIds: store.selectionIds, write: { ok: false, reason: "NOT_IN_FILE" } };
  }
  if (!store.boardExists(boardId)) {
    return { session, selectionIds: store.selectionIds, write: { ok: false, reason: "NOT_A_BOARD" } };
  }
  const next = addMount(session, boardId, name);
  if (next.revision !== session.revision) save(store, next);
  return { session: next, selectionIds: store.selectionIds };
}

export function citeMaterial(store: SessionStore, materialId: string): AssistantResult {
  const session = loadBoundSession(store);
  if (!store.fileId || session.fileId !== store.fileId) {
    return { session, selectionIds: store.selectionIds, write: { ok: false, reason: "NOT_IN_FILE" } };
  }
  const next = addMaterial(session, materialId);
  if (next.revision !== session.revision) save(store, next);
  return { session: next, selectionIds: store.selectionIds };
}

export function removeMountedBoard(store: SessionStore, boardId: string): AssistantResult {
  const session = loadBoundSession(store);
  if (!store.fileId || session.fileId !== store.fileId) {
    return { session, selectionIds: store.selectionIds, write: { ok: false, reason: "NOT_IN_FILE" } };
  }
  const next = removeMount(session, boardId);
  if (next.revision !== session.revision) save(store, next);
  return { session: next, selectionIds: store.selectionIds };
}

export function lockMountedBoard(store: SessionStore, boardId: string, locked: boolean): AssistantResult {
  const session = loadBoundSession(store);
  if (!store.fileId || session.fileId !== store.fileId) {
    return { session, selectionIds: store.selectionIds, write: { ok: false, reason: "NOT_IN_FILE" } };
  }
  const next = setMountLocked(session, boardId, locked);
  if (next.revision !== session.revision) save(store, next);
  return { session: next, selectionIds: store.selectionIds };
}

export function touchMountedBoard(store: SessionStore, captured: CapturedWrite): AssistantResult {
  const session = loadBoundSession(store);
  const ok = allowWrite(
    {
      fileId: captured.fileId,
      pageId: captured.pageId,
      boardId: captured.boardId,
      expectedRevision: captured.expectedRevision,
      mountedBoardIds: session.mounts.map((mount) => mount.boardId),
      lockedBoardIds: session.mounts.filter((mount) => mount.locked).map((mount) => mount.boardId),
    },
    {
      currentFileId: store.fileId,
      currentPageId: store.pageId,
      boardExists: store.boardExists(captured.boardId),
      revision: session.revision,
    },
  );
  return {
    session,
    selectionIds: store.selectionIds,
    write: { ok, reason: ok ? "" : "WRITE_REJECTED" },
  };
}
