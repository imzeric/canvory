import { describe, expect, it } from "vitest";
import { createAssistantRuntime } from "./assistant-runtime.js";

function fakePenpot() {
  const shapes = [{ id: "board-1", name: "封面", type: "board" }];
  const created: string[] = [];
  const box = { saved: null as string | null };
  const file = {
    id: "file-a",
    getPluginData: () => box.saved,
    setPluginData: (_key: string, value: string) => {
      box.saved = value;
    },
    createBoard: () => {
      created.push("createBoard");
    },
  };
  const page = {
    id: "page-a",
    getShapeById: (id: string) => shapes.find((shape) => shape.id === id) ?? null,
    findShapes: () => shapes,
  };
  return {
    created,
    box,
    api: {
      currentFile: file as {
        id: string;
        getPluginData: () => string | null;
        setPluginData: (key: string, value: string) => void;
      },
      currentPage: page,
      selection: [] as { id?: string }[],
    },
  };
}

function payloadOf(sent: unknown[], requestId: string) {
  const message = sent.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      (item as { requestId?: string }).requestId === requestId,
  ) as { payload?: { write?: { ok: boolean; reason: string }; writeEpoch: number; acceptingWrites: boolean; session: { mounts: { boardId: string }[]; revision: number } } };
  return message.payload;
}

describe("assistant runtime", () => {
  it("stores the session in plugin data and reloads it", () => {
    const host = fakePenpot();
    const sent: unknown[] = [];
    const runtime = createAssistantRuntime(host.api, (message) => sent.push(message));
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:mount",
      requestId: "m1",
      boardId: "board-1",
      fileId: "file-a",
      writeEpoch: 1,
    });
    expect(host.box.saved).toContain("board-1");
    const again = createAssistantRuntime(host.api, (message) => sent.push(message));
    again.handle({ source: "canvory-ui", type: "assistant:load", requestId: "load" });
    expect(payloadOf(sent, "load")?.session.mounts.map((mount) => mount.boardId)).toEqual(["board-1"]);
  });

  it("drops write rights after finish until the file changes, and never creates shapes", () => {
    const host = fakePenpot();
    const sent: unknown[] = [];
    const runtime = createAssistantRuntime(host.api, (message) => sent.push(message));
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:mount",
      requestId: "m1",
      boardId: "board-1",
      fileId: "file-a",
      writeEpoch: 1,
    });
    const saved = host.box.saved;
    runtime.emit("finish");
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:write",
      requestId: "w1",
      boardId: "board-1",
      fileId: "file-a",
      pageId: "page-a",
      expectedRevision: 1,
      writeEpoch: 1,
      code: "process.exit(0)",
    });
    expect(payloadOf(sent, "w1")?.write).toEqual({ ok: false, reason: "SESSION_CLOSED" });
    expect(host.box.saved).toBe(saved);
    expect(host.created).toEqual([]);
    runtime.emit("filechange");
    const open = sent.at(-1) as { payload: { writeEpoch: number; acceptingWrites: boolean } };
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:write",
      requestId: "w2",
      boardId: "board-1",
      fileId: "file-a",
      pageId: "page-a",
      expectedRevision: 1,
      writeEpoch: open.payload.writeEpoch - 1,
    });
    expect(payloadOf(sent, "w2")?.write?.ok).toBe(false);
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:write",
      requestId: "w3",
      boardId: "board-1",
      fileId: "file-a",
      pageId: "page-a",
      expectedRevision: 1,
      writeEpoch: open.payload.writeEpoch,
    });
    expect(payloadOf(sent, "w3")?.write?.ok).toBe(true);
    expect(host.created).toEqual([]);
    expect(host.box.saved).toBe(saved);
  });

  it("stores a material citation and drops it after finish", () => {
    const host = fakePenpot();
    const sent: unknown[] = [];
    const runtime = createAssistantRuntime(host.api, (message) => sent.push(message));
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:cite",
      requestId: "c1",
      materialId: "mat-1",
      fileId: "file-a",
      writeEpoch: 1,
    });
    expect(host.box.saved).toContain("mat-1");
    const saved = host.box.saved;
    runtime.emit("finish");
    runtime.handle({
      source: "canvory-ui",
      type: "assistant:cite",
      requestId: "c2",
      materialId: "mat-2",
      fileId: "file-a",
      writeEpoch: 1,
    });
    expect(payloadOf(sent, "c2")?.write?.reason).toBe("SESSION_CLOSED");
    expect(host.box.saved).toBe(saved);
  });
});
