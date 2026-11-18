import { describe, expect, it } from "vitest";
import { addMount, parseFileSession, removeMount, sessionForFile, setMountLocked } from "./session.js";

describe("sessionForFile", () => {
  it("does not carry mounts into another file", () => {
    const stored = parseFileSession({
      fileId: "file-a",
      pageId: "page-a",
      revision: 2,
      mounts: [{ boardId: "b1", name: "封面", locked: false }],
      materialIds: ["mat-1"],
    });
    const next = sessionForFile(stored, "file-b", "page-b");
    expect(next.mounts).toEqual([]);
    expect(next.materialIds).toEqual([]);
    expect(next.fileId).toBe("file-b");
  });

  it("rejects a revision that is not a nonnegative integer", () => {
    const base = {
      fileId: "file-a",
      pageId: "page-a",
      mounts: [],
      materialIds: [],
    };
    expect(() => parseFileSession({ ...base, revision: -1 })).toThrow("FILE_SESSION_INVALID");
    expect(() => parseFileSession({ ...base, revision: 1.5 })).toThrow("FILE_SESSION_INVALID");
    expect(() => parseFileSession({ ...base, revision: Number.NaN })).toThrow("FILE_SESSION_INVALID");
  });

  it("bumps the revision when a mount is added, removed, or locked", () => {
    const stored = parseFileSession({
      fileId: "file-a",
      pageId: "page-a",
      revision: 2,
      mounts: [{ boardId: "b1", name: "封面", locked: false }],
      materialIds: [],
    });
    const added = addMount(stored, "b2", "目录");
    expect(added.revision).toBe(3);
    expect(addMount(added, "b2", "目录").revision).toBe(3);
    const locked = setMountLocked(added, "b1", true);
    expect(locked.mounts.find((mount) => mount.boardId === "b1")?.locked).toBe(true);
    expect(locked.revision).toBe(4);
    const removed = removeMount(locked, "b2");
    expect(removed.mounts.map((mount) => mount.boardId)).toEqual(["b1"]);
    expect(removed.revision).toBe(5);
  });
});
