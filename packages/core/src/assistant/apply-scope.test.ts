import { describe, expect, it } from "vitest";
import { decideApply, decideCreate } from "./apply-scope.js";
import type { WriteIntent } from "./types.js";

const intent: WriteIntent = {
  fileId: "file-a",
  pageId: "page-a",
  boardId: "board-1",
  expectedRevision: 1,
  mountedBoardIds: ["board-1"],
  lockedBoardIds: [],
};
const snap = { currentFileId: "file-a", currentPageId: "page-a", boardExists: true, revision: 1 };
const ops = [{ op: "createText" as const, boardId: "board-1", name: "t", text: "新", x: 0, y: 0, width: 10, height: 10 }];
const createOps = [{ op: "createBoard" as const, name: "新页", width: 1920, height: 1080 }];

describe("draw scope", () => {
  it("returns no ops when the board revision changed under the user", () => {
    const decision = decideApply({
      boardId: "board-1",
      intent,
      snap,
      boardRevision: 2,
      expectedBoardRevision: 1,
      cancelled: false,
      ops,
    });
    expect(decision.status).toBe("skipped_user_edit");
    expect(decision.ops).toEqual([]);
  });

  it("still skips a hand edit when the mount revision is unchanged", () => {
    const decision = decideApply({
      boardId: "board-1",
      intent,
      snap: { ...snap, revision: 1 },
      boardRevision: 4,
      expectedBoardRevision: 1,
      cancelled: false,
      ops,
    });
    expect(decision.status).toBe("skipped_user_edit");
  });

  it("stops without ops when cancelled", () => {
    const decision = decideApply({
      boardId: "board-1",
      intent,
      snap,
      boardRevision: 1,
      expectedBoardRevision: 1,
      cancelled: true,
      ops,
    });
    expect(decision.status).toBe("stopped");
    expect(decision.ops).toEqual([]);
  });

  it("allows a new board without a prior mount", () => {
    const decision = decideCreate({
      fileId: "file-a",
      pageId: "page-a",
      epoch: 1,
      snapFileId: "file-a",
      snapPageId: "page-a",
      snapEpoch: 1,
      accepting: true,
      cancelled: false,
      ops: createOps,
    });
    expect(decision.status).toBe("drawn");
    expect(decision.ops).toEqual(createOps);
  });

  it("does not create after the file session epoch changes", () => {
    const decision = decideCreate({
      fileId: "file-a",
      pageId: "page-a",
      epoch: 1,
      snapFileId: "file-a",
      snapPageId: "page-a",
      snapEpoch: 2,
      accepting: true,
      cancelled: false,
      ops: createOps,
    });
    expect(decision.status).toBe("stopped");
    expect(decision.ops).toEqual([]);
  });
});
