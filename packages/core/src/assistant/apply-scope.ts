import type { HostOp } from "./host-ops.js";
import type { WriteGateSnapshot, WriteIntent } from "./types.js";
import { allowWrite } from "./write-gate.js";

export interface ApplyDecision {
  boardId: string;
  status: "drawn" | "failed" | "stopped" | "skipped_user_edit";
  ops: HostOp[];
}

export function decideCreate(input: {
  fileId: string;
  pageId: string;
  epoch: number;
  snapFileId: string | null;
  snapPageId: string | null;
  snapEpoch: number;
  accepting: boolean;
  cancelled: boolean;
  ops: HostOp[];
}): ApplyDecision {
  if (input.cancelled || !input.accepting || input.snapEpoch !== input.epoch) {
    return { boardId: "", status: "stopped", ops: [] };
  }
  if (input.snapFileId !== input.fileId || input.snapPageId !== input.pageId) {
    return { boardId: "", status: "stopped", ops: [] };
  }
  return { boardId: "", status: "drawn", ops: input.ops };
}

export function decideApply(input: {
  boardId: string;
  intent: WriteIntent;
  snap: WriteGateSnapshot;
  boardRevision: number;
  expectedBoardRevision: number;
  cancelled: boolean;
  ops: HostOp[];
}): ApplyDecision {
  if (input.cancelled) return { boardId: input.boardId, status: "stopped", ops: [] };
  if (input.boardRevision !== input.expectedBoardRevision) {
    return { boardId: input.boardId, status: "skipped_user_edit", ops: [] };
  }
  if (!allowWrite(input.intent, input.snap)) {
    return { boardId: input.boardId, status: "skipped_user_edit", ops: [] };
  }
  return { boardId: input.boardId, status: "drawn", ops: input.ops };
}
