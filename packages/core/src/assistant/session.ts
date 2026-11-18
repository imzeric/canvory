import type { FileSession, MountRecord } from "./types.js";

function isMount(value: unknown): value is MountRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as MountRecord;
  return typeof row.boardId === "string" && typeof row.name === "string" && typeof row.locked === "boolean";
}

export function parseFileSession(input: unknown): FileSession {
  if (!input || typeof input !== "object") throw new Error("FILE_SESSION_INVALID");
  const row = input as FileSession;
  if (typeof row.fileId !== "string" || typeof row.pageId !== "string" || typeof row.revision !== "number") {
    throw new Error("FILE_SESSION_INVALID");
  }
  if (!Array.isArray(row.mounts) || !row.mounts.every(isMount)) throw new Error("FILE_SESSION_INVALID");
  if (!Array.isArray(row.materialIds) || !row.materialIds.every((id) => typeof id === "string")) {
    throw new Error("FILE_SESSION_INVALID");
  }
  return {
    fileId: row.fileId,
    pageId: row.pageId,
    revision: row.revision,
    mounts: row.mounts.map((mount) => ({ ...mount })),
    materialIds: [...row.materialIds],
  };
}

export function sessionForFile(stored: FileSession | null, fileId: string, pageId: string): FileSession {
  if (!stored || stored.fileId !== fileId) {
    return { fileId, pageId, revision: 0, mounts: [], materialIds: [] };
  }
  return { ...stored, pageId };
}

export function addMount(session: FileSession, boardId: string, name: string): FileSession {
  if (session.mounts.some((mount) => mount.boardId === boardId)) return session;
  return {
    ...session,
    revision: session.revision + 1,
    mounts: [...session.mounts, { boardId, name, locked: false }],
  };
}

export function removeMount(session: FileSession, boardId: string): FileSession {
  if (!session.mounts.some((mount) => mount.boardId === boardId)) return session;
  return {
    ...session,
    revision: session.revision + 1,
    mounts: session.mounts.filter((mount) => mount.boardId !== boardId),
  };
}

export function setMountLocked(session: FileSession, boardId: string, locked: boolean): FileSession {
  const current = session.mounts.find((mount) => mount.boardId === boardId);
  if (!current || current.locked === locked) return session;
  return {
    ...session,
    revision: session.revision + 1,
    mounts: session.mounts.map((mount) => (mount.boardId === boardId ? { ...mount, locked } : mount)),
  };
}
