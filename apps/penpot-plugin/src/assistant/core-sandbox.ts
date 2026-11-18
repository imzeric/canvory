export {
  addMaterial,
  addMount,
  parseFileSession,
  removeMount,
  sessionForFile,
  setMountLocked,
} from "../../../../packages/core/src/assistant/session.js";
export { allowWrite } from "../../../../packages/core/src/assistant/write-gate.js";
export { decideApply, decideCreate } from "../../../../packages/core/src/assistant/apply-scope.js";
export { BOARD_REVISION_KEY, readBoardRevision } from "../../../../packages/core/src/assistant/draw-plan.js";
export { assertExecutableOps } from "../../../../packages/core/src/assistant/host-op-guard.js";
export type { FileSession, MountRecord, WriteGateSnapshot, WriteIntent } from "../../../../packages/core/src/assistant/types.js";
export type { HostOp } from "../../../../packages/core/src/assistant/host-ops.js";
export type { ApplyDecision } from "../../../../packages/core/src/assistant/apply-scope.js";
