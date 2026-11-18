import { describe, expect, it } from "vitest";
import {
  loadBoundSession,
  lockMountedBoard,
  mountBoard,
  SESSION_KEY,
  touchMountedBoard,
  type SessionStore,
} from "./session-controller.js";

function memoryStore(fileId: string): SessionStore {
  const box = { saved: null as string | null };
  return {
    fileId,
    pageId: "page-a",
    selectionIds: ["board-1"],
    getData: () => box.saved,
    setData: (value) => {
      box.saved = value;
    },
    boardExists: (boardId) => boardId === "board-1",
  };
}

describe("session controller", () => {
  it("persists a mount and reloads it for the same file", () => {
    const store = memoryStore("file-a");
    const mounted = mountBoard(store, "board-1", "封面");
    expect(mounted.session.mounts.map((mount) => mount.boardId)).toEqual(["board-1"]);
    expect(store.getData()).toContain("board-1");
    const again = mountBoard({ ...store, selectionIds: ["board-2"] }, "board-1", "封面");
    expect(again.session.mounts).toHaveLength(1);
    expect(SESSION_KEY).toBe("canvory.mounts");
  });

  it("does not keep mounts after the file id changes", () => {
    const store = memoryStore("file-a");
    mountBoard(store, "board-1", "封面");
    const other = memoryStore("file-b");
    other.setData(store.getData() ?? "");
    const loaded = loadBoundSession(other);
    expect(loaded.fileId).toBe("file-b");
    expect(loaded.mounts).toEqual([]);
  });

  it("does not mount a shape that is not a user board", () => {
    const store = memoryStore("file-a");
    const rejected = mountBoard(store, "root-frame", "页面根");
    expect(rejected.write?.reason).toBe("NOT_A_BOARD");
    expect(store.getData()).toBeNull();
  });

  it("does not write a mount when there is no open file", () => {
    const store = memoryStore("file-a");
    const missing = mountBoard({ ...store, fileId: null }, "board-1", "封面");
    expect(missing.write?.reason).toBe("NOT_IN_FILE");
    expect(missing.session.mounts).toEqual([]);
  });

  it("rejects a canvas write to a board that is not mounted", () => {
    const store = memoryStore("file-a");
    const result = touchMountedBoard(store, {
      fileId: "file-a",
      pageId: "page-a",
      boardId: "board-1",
      expectedRevision: 0,
    });
    expect(result.write).toEqual({ ok: false, reason: "WRITE_REJECTED" });
  });

  it("allows a canvas write only when the mount, file, and revision match", () => {
    const store = memoryStore("file-a");
    const mounted = mountBoard(store, "board-1", "封面");
    const result = touchMountedBoard(
      { ...store, selectionIds: ["board-2"] },
      {
        fileId: "file-a",
        pageId: "page-a",
        boardId: "board-1",
        expectedRevision: mounted.session.revision,
      },
    );
    expect(result.write?.ok).toBe(true);
    expect(mounted.session.revision).toBe(1);
  });

  it("rejects a stale file, page, or revision and a locked mount", () => {
    const store = memoryStore("file-a");
    const mounted = mountBoard(store, "board-1", "封面");
    const captured = {
      fileId: "file-a",
      pageId: "page-a",
      boardId: "board-1",
      expectedRevision: mounted.session.revision,
    };
    expect(touchMountedBoard(store, { ...captured, fileId: "file-old" }).write?.ok).toBe(false);
    expect(touchMountedBoard({ ...store, pageId: "page-b" }, captured).write?.ok).toBe(false);
    expect(touchMountedBoard(store, { ...captured, expectedRevision: 0 }).write?.ok).toBe(false);
    lockMountedBoard(store, "board-1", true);
    expect(touchMountedBoard(store, { ...captured, expectedRevision: 2 }).write?.ok).toBe(false);
  });
});
