import type { WriteGateSnapshot, WriteIntent } from "./types.js";

export function allowWrite(intent: WriteIntent, snap: WriteGateSnapshot): boolean {
  if (snap.currentFileId !== intent.fileId) return false;
  if (snap.currentPageId !== intent.pageId) return false;
  if (!snap.boardExists) return false;
  if (snap.revision !== intent.expectedRevision) return false;
  if (!intent.mountedBoardIds.includes(intent.boardId)) return false;
  if (intent.lockedBoardIds.includes(intent.boardId)) return false;
  return true;
}
