import { describe, expect, it } from "vitest";
import { allowWrite } from "./write-gate.js";

const intent = {
  fileId: "file-a",
  pageId: "page-a",
  boardId: "board-1",
  expectedRevision: 3,
  mountedBoardIds: ["board-1"],
  lockedBoardIds: [] as string[],
};

describe("allowWrite", () => {
  it("refuses a write when the open file changed", () => {
    expect(
      allowWrite(intent, {
        currentFileId: "file-b",
        currentPageId: "page-a",
        boardExists: true,
        revision: 3,
      }),
    ).toBe(false);
  });

  it("refuses a board that is not mounted", () => {
    expect(
      allowWrite(
        { ...intent, boardId: "board-9" },
        {
          currentFileId: "file-a",
          currentPageId: "page-a",
          boardExists: true,
          revision: 3,
        },
      ),
    ).toBe(false);
  });

  it("refuses a stale revision or a locked board", () => {
    expect(
      allowWrite(intent, {
        currentFileId: "file-a",
        currentPageId: "page-a",
        boardExists: true,
        revision: 4,
      }),
    ).toBe(false);
    expect(
      allowWrite(
        { ...intent, lockedBoardIds: ["board-1"] },
        {
          currentFileId: "file-a",
          currentPageId: "page-a",
          boardExists: true,
          revision: 3,
        },
      ),
    ).toBe(false);
  });

  it("allows a mounted unlocked board when file, page, and revision match", () => {
    expect(
      allowWrite(intent, {
        currentFileId: "file-a",
        currentPageId: "page-a",
        boardExists: true,
        revision: 3,
      }),
    ).toBe(true);
  });
});
