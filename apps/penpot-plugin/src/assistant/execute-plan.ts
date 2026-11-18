import {
  assertExecutableOps,
  BOARD_REVISION_KEY,
  decideApply,
  decideCreate,
  type HostOp,
} from "@canvory/core";

export interface DrawShape {
  id: string;
  name: string;
  x: number;
  y: number;
  text?: string;
  resize(width: number, height: number): void;
  appendChild(child: DrawShape): void;
  getPluginData(key: string): string | null;
  setPluginData(key: string, value: string): void;
}

export interface DrawApi {
  history: {
    undoBlockBegin(): symbol;
    undoBlockFinish(id: symbol): void;
  };
  createBoard(): DrawShape;
  createText(text: string): DrawShape;
  createRectangle(): DrawShape;
  createEllipse(): DrawShape;
  findShape(id: string): DrawShape | null;
  hasMedia(id: string): boolean;
  placeExistingMedia?(
    board: DrawShape,
    mediaId: string,
    box: { name?: string; x: number; y: number; width: number; height: number },
  ): void;
}

export interface DrawContext {
  expectedFileId: string;
  expectedPageId: string;
  expectedEpoch: number;
  fileId(): string | null;
  pageId(): string | null;
  epoch(): number;
  accepting(): boolean;
  mounted(): string[];
  locked(): string[];
  cancelled(): boolean;
  boardRevision(boardId: string): number;
  expectedBoardRevision?: Record<string, number>;
}

export interface BoardOutcome {
  name: string;
  boardId: string;
  status: "drawn" | "failed" | "stopped" | "skipped_user_edit";
}

type CreateGroup = { kind: "create"; name: string; width: number; height: number; children: HostOp[] };
type EditGroup = { kind: "edit"; boardId: string; name: string; ops: HostOp[] };

function groupOps(ops: HostOp[]): Array<CreateGroup | EditGroup> {
  const groups: Array<CreateGroup | EditGroup> = [];
  let current: CreateGroup | null = null;
  for (const op of ops) {
    if (op.op === "setPluginData") continue;
    if (op.op === "createBoard") {
      current = { kind: "create", name: op.name, width: op.width, height: op.height, children: [] };
      groups.push(current);
      continue;
    }
    if (op.op === "replaceText") {
      groups.push({ kind: "edit", boardId: "", name: op.nodeId, ops: [op] });
      current = null;
      continue;
    }
    if (op.boardId === "$new" && current) {
      current.children.push(op);
      continue;
    }
    groups.push({ kind: "edit", boardId: op.boardId, name: "name" in op ? op.name : op.mediaId, ops: [op] });
    current = null;
  }
  return groups;
}

function sessionClosed(ctx: DrawContext): boolean {
  return (
    ctx.cancelled() ||
    !ctx.accepting() ||
    ctx.epoch() !== ctx.expectedEpoch ||
    ctx.fileId() !== ctx.expectedFileId ||
    ctx.pageId() !== ctx.expectedPageId
  );
}

function place(board: DrawShape, shape: DrawShape, box: { x: number; y: number; width: number; height: number; name: string }) {
  shape.name = box.name;
  shape.x = box.x;
  shape.y = box.y;
  shape.resize(box.width, box.height);
  board.appendChild(shape);
}

export function executeHostPlan(input: unknown, ctx: DrawContext, api: DrawApi): BoardOutcome[] {
  const ops = assertExecutableOps(input);
  const expectedRevision: Record<string, number> = { ...(ctx.expectedBoardRevision ?? {}) };
  for (const boardId of ctx.mounted()) {
    if (expectedRevision[boardId] === undefined) expectedRevision[boardId] = ctx.boardRevision(boardId);
  }
  const outcomes: BoardOutcome[] = [];
  for (const group of groupOps(ops)) {
    if (sessionClosed(ctx)) {
      outcomes.push({ name: group.name, boardId: group.kind === "edit" ? group.boardId : "", status: "stopped" });
      continue;
    }
    if (group.kind === "create") {
      const decision = decideCreate({
        fileId: ctx.expectedFileId,
        pageId: ctx.expectedPageId,
        epoch: ctx.expectedEpoch,
        snapFileId: ctx.fileId(),
        snapPageId: ctx.pageId(),
        snapEpoch: ctx.epoch(),
        accepting: ctx.accepting(),
        cancelled: ctx.cancelled(),
        ops: [{ op: "createBoard", name: group.name, width: group.width, height: group.height }],
      });
      if (decision.status !== "drawn") {
        outcomes.push({ name: group.name, boardId: "", status: decision.status });
        continue;
      }
      const token = api.history.undoBlockBegin();
      try {
        const board = api.createBoard();
        board.name = group.name;
        board.resize(group.width, group.height);
        for (const child of group.children) {
          if (child.op === "uploadMedia") {
            if (!api.hasMedia(child.mediaId) || !api.placeExistingMedia) throw new Error("MEDIA_MISSING");
            api.placeExistingMedia(board, child.mediaId, child);
          }
          if (child.op === "createText") place(board, api.createText(child.text), child);
          if (child.op === "createRectangle") place(board, api.createRectangle(), child);
          if (child.op === "createEllipse") place(board, api.createEllipse(), child);
        }
        board.setPluginData(BOARD_REVISION_KEY, "1");
        api.history.undoBlockFinish(token);
        outcomes.push({ name: group.name, boardId: board.id, status: "drawn" });
      } catch {
        api.history.undoBlockFinish(token);
        outcomes.push({ name: group.name, boardId: "", status: "failed" });
      }
      continue;
    }
    const board = api.findShape(group.boardId);
    const decision = decideApply({
      boardId: group.boardId,
      intent: {
        fileId: ctx.expectedFileId,
        pageId: ctx.expectedPageId,
        boardId: group.boardId,
        expectedRevision: 0,
        mountedBoardIds: ctx.mounted(),
        lockedBoardIds: ctx.locked(),
      },
      snap: {
        currentFileId: ctx.fileId(),
        currentPageId: ctx.pageId(),
        boardExists: Boolean(board),
        revision: 0,
      },
      boardRevision: ctx.boardRevision(group.boardId),
      expectedBoardRevision: expectedRevision[group.boardId] ?? -1,
      cancelled: ctx.cancelled(),
      ops: group.ops,
    });
    if (decision.status !== "drawn" || !board) {
      outcomes.push({ name: group.name, boardId: group.boardId, status: decision.status === "drawn" ? "skipped_user_edit" : decision.status });
      continue;
    }
    const token = api.history.undoBlockBegin();
    try {
      for (const op of decision.ops) {
        if (op.op === "createText") place(board, api.createText(op.text), op);
        if (op.op === "createRectangle") place(board, api.createRectangle(), op);
        if (op.op === "createEllipse") place(board, api.createEllipse(), op);
        if (op.op === "uploadMedia") {
          if (!api.hasMedia(op.mediaId) || !api.placeExistingMedia) throw new Error("MEDIA_MISSING");
          api.placeExistingMedia(board, op.mediaId, op);
        }
      }
      const next = ctx.boardRevision(group.boardId) + 1;
      board.setPluginData(BOARD_REVISION_KEY, String(next));
      api.history.undoBlockFinish(token);
      outcomes.push({ name: group.name, boardId: board.id, status: "drawn" });
    } catch {
      api.history.undoBlockFinish(token);
      outcomes.push({ name: group.name, boardId: board.id, status: "failed" });
    }
  }
  return outcomes;
}
