import { describe, expect, it } from "vitest";
import { BOARD_REVISION_KEY } from "@canvory/core";
import { executeHostPlan, type DrawApi, type DrawContext, type DrawShape } from "./execute-plan.js";

function shape(id: string): DrawShape & { plugin: Record<string, string>; children: DrawShape[] } {
  const row = {
    id,
    name: id,
    x: 0,
    y: 0,
    plugin: {} as Record<string, string>,
    children: [] as DrawShape[],
    resize() {
      return undefined;
    },
    appendChild(child: DrawShape) {
      row.children.push(child);
    },
    getPluginData(key: string) {
      return row.plugin[key] ?? null;
    },
    setPluginData(key: string, value: string) {
      row.plugin[key] = value;
    },
  };
  return row;
}

function harness() {
  const calls: string[] = [];
  const boards: Array<ReturnType<typeof shape>> = [];
  let seq = 0;
  const api: DrawApi = {
    history: {
      undoBlockBegin() {
        calls.push("begin");
        return Symbol("undo");
      },
      undoBlockFinish() {
        calls.push("finish");
      },
    },
    createBoard() {
      calls.push("board");
      const board = shape(`board-${++seq}`);
      boards.push(board);
      return board;
    },
    createText(text: string) {
      calls.push(`text:${text}`);
      const node = shape(`text-${seq}`);
      node.text = text;
      return node;
    },
    createRectangle() {
      calls.push("rect");
      return shape(`rect-${seq}`);
    },
    createEllipse() {
      calls.push("ellipse");
      return shape(`ellipse-${seq}`);
    },
    findShape(id: string) {
      return boards.find((board) => board.id === id) ?? null;
    },
    hasMedia(id: string) {
      return id === "media-ok";
    },
  };
  const state = {
    fileId: "file-a",
    pageId: "page-a",
    epoch: 1,
    accepting: true,
    mounted: [] as string[],
    locked: [] as string[],
    cancelled: false,
    revisions: {} as Record<string, number>,
  };
  const ctx: DrawContext = {
    expectedFileId: "file-a",
    expectedPageId: "page-a",
    expectedEpoch: 1,
    fileId: () => state.fileId,
    pageId: () => state.pageId,
    epoch: () => state.epoch,
    accepting: () => state.accepting,
    mounted: () => state.mounted,
    locked: () => state.locked,
    cancelled: () => state.cancelled,
    boardRevision: (id: string) => state.revisions[id] ?? 0,
  };
  return { api, calls, boards, state, ctx };
}

const createTwo = [
  { op: "createBoard", name: "IT7484-M3-FIXTURE-1", width: 1920, height: 1080 },
  { op: "createText", boardId: "$new", name: "标题", text: "测试夹具", x: 120, y: 100, width: 880, height: 140 },
  { op: "createBoard", name: "IT7484-M3-FIXTURE-2", width: 1920, height: 1080 },
  { op: "createText", boardId: "$new", name: "标题2", text: "第二页", x: 120, y: 100, width: 880, height: 140 },
];

describe("executeHostPlan", () => {
  it("creates boards on an empty mount set and wraps each board once", () => {
    const host = harness();
    const outcomes = executeHostPlan(createTwo, host.ctx, host.api);
    expect(outcomes.map((item) => item.status)).toEqual(["drawn", "drawn"]);
    expect(host.calls.filter((call) => call === "begin")).toHaveLength(2);
    expect(host.calls.filter((call) => call === "finish")).toHaveLength(2);
    expect(host.boards[0]?.plugin[BOARD_REVISION_KEY]).toBe("1");
    expect(host.boards[0]?.children).toHaveLength(1);
  });

  it("does not edit a board that is not mounted", () => {
    const host = harness();
    host.state.mounted = ["board-other"];
    const outcomes = executeHostPlan(
      [{ op: "createText", boardId: "board-1", name: "改", text: "不该写", x: 0, y: 0, width: 10, height: 10 }],
      host.ctx,
      host.api,
    );
    expect(outcomes[0]?.status).toBe("skipped_user_edit");
    expect(host.calls).toEqual([]);
  });

  it("skips a mounted board whose own revision changed", () => {
    const host = harness();
    const board = shape("board-1");
    host.boards.push(board);
    host.state.mounted = ["board-1"];
    let reads = 0;
    const outcomes = executeHostPlan(
      [{ op: "createText", boardId: "board-1", name: "改", text: "手改后", x: 0, y: 0, width: 10, height: 10 }],
      {
        ...host.ctx,
        boardRevision: () => {
          reads += 1;
          return reads === 1 ? 2 : 3;
        },
      },
      host.api,
    );
    expect(outcomes[0]?.status).toBe("skipped_user_edit");
    expect(board.children).toHaveLength(0);
  });

  it("leaves the finished board in place when a later board is cancelled", () => {
    const host = harness();
    const outcomes = executeHostPlan(createTwo, {
      ...host.ctx,
      cancelled: () => host.boards.length > 0,
    }, host.api);
    expect(outcomes.map((item) => item.status)).toEqual(["drawn", "stopped"]);
    expect(host.boards).toHaveLength(1);
  });

  it("closes the undo block when a board fails and still draws the next one", () => {
    const host = harness();
    host.api.createText = () => {
      throw new Error("text failed");
    };
    const outcomes = executeHostPlan(
      [
        { op: "createBoard", name: "坏页", width: 100, height: 100 },
        { op: "createText", boardId: "$new", name: "标题", text: "失败", x: 0, y: 0, width: 10, height: 10 },
        { op: "createBoard", name: "好页", width: 100, height: 100 },
      ],
      host.ctx,
      host.api,
    );
    expect(outcomes.map((item) => item.status)).toEqual(["failed", "drawn"]);
    expect(host.calls.filter((call) => call === "finish").length).toBeGreaterThan(0);
  });

  it("does not write plugin session data from the model", () => {
    const host = harness();
    expect(() =>
      executeHostPlan(
        [{ op: "setPluginData", target: "file", id: "file-a", key: "canvory.mounts", value: "{}" }],
        host.ctx,
        host.api,
      ),
    ).toThrow("HOST_OP_REJECTED");
    expect(host.calls).toEqual([]);
  });
});
