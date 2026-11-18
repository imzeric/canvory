export interface WriteIntent {
  fileId: string;
  pageId: string;
  boardId: string;
  expectedRevision: number;
  mountedBoardIds: string[];
  lockedBoardIds: string[];
}

export interface WriteGateSnapshot {
  currentFileId: string | null;
  currentPageId: string | null;
  boardExists: boolean;
  revision: number;
}

export interface MountRecord {
  boardId: string;
  name: string;
  locked: boolean;
}

export interface FileSession {
  fileId: string;
  pageId: string;
  revision: number;
  mounts: MountRecord[];
  materialIds: string[];
}
