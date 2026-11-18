import { executeHostPlan, type BoardOutcome, type DrawContext, type DrawShape } from "./execute-plan.js";
import type { HostOp } from "@canvory/core";

type PenpotShape = DrawShape & { parent?: PenpotShape | null };

type PenpotApi = {
  currentFile?: { id?: string } | null;
  currentPage?: { id?: string; getShapeById?: (id: string) => PenpotShape | null } | null;
  history?: DrawContext extends never ? never : {
    undoBlockBegin(): symbol;
    undoBlockFinish(id: symbol): void;
  };
  createBoard?: () => PenpotShape;
  createText?: (text: string) => PenpotShape;
  createRectangle?: () => PenpotShape;
  createEllipse?: () => PenpotShape;
  uploadMediaUrl?: unknown;
};

export const FIXTURE_LABEL = "测试夹具，不是模型生成";

export function fixtureCreateOps(): HostOp[] {
  return [
    { op: "createBoard", name: "IT7484-M3-FIXTURE-1", width: 1920, height: 1080 },
    { op: "createText", boardId: "$new", name: "IT7484-M3-TEXT", text: FIXTURE_LABEL, x: 120, y: 100, width: 880, height: 140 },
    { op: "createRectangle", boardId: "$new", name: "IT7484-M3-RECT", x: 160, y: 280, width: 480, height: 280 },
    { op: "createBoard", name: "IT7484-M3-FIXTURE-2", width: 1920, height: 1080 },
    { op: "createText", boardId: "$new", name: "IT7484-M3-TEXT-2", text: "第二页测试夹具", x: 120, y: 100, width: 880, height: 140 },
  ];
}

export function fixtureEditOps(boardIds: string[]): HostOp[] {
  return boardIds.map((boardId) => ({
    op: "createText" as const,
    boardId,
    name: "IT7484-M3-EDIT",
    text: "只改已挂载的测试夹具",
    x: 120,
    y: 320,
    width: 880,
    height: 80,
  }));
}

export function drawWithPenpot(penpot: PenpotApi, ops: HostOp[], ctx: DrawContext): BoardOutcome[] {
  if (!penpot.history || !penpot.createBoard || !penpot.createText || !penpot.createRectangle || !penpot.createEllipse) {
    return ops.length ? [{ name: "宿主", boardId: "", status: "failed" }] : [];
  }
  return executeHostPlan(ops, ctx, {
    history: penpot.history,
    createBoard: () => penpot.createBoard!(),
    createText: (text) => penpot.createText!(text),
    createRectangle: () => penpot.createRectangle!(),
    createEllipse: () => penpot.createEllipse!(),
    findShape: (id) => penpot.currentPage?.getShapeById?.(id) ?? null,
    hasMedia: (id) => Boolean(penpot.currentPage?.getShapeById?.(id)),
  });
}
