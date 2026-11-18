# 宿主绘制与范围编辑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 只对已挂载且通过写入闸门的 Board 生成一组可撤销的宿主操作。

**Architecture:** 计划函数不调用 Penpot。它返回 `HostOp[]`。插件执行器拿到真实 `penpot` 对象后，按一页一个 `undoBlockBegin` / `undoBlockFinish` 执行。测试使用假的 history 记录调用顺序。

**Tech Stack:** TypeScript、Vitest、Penpot plugin API 2.4.3 的 `createBoard`、`appendChild`、`history.undoBlockBegin`、`history.undoBlockFinish`。

## Global Constraints

- 未出现在 `mountedBoardIds` 的 id 不产生写入操作。
- `locked: true` 的挂载不产生写入操作。
- `allowWrite` 返回 false 时该 Board 的状态是 `skipped_user_edit`，操作数组为空。
- 每一张要绘制的 Board 恰好一对 `undoBlockBegin` 与 `undoBlockFinish`。
- 不修改 Penpot 源码。

---

### Task 1: 由章节得到操作

**Files:**
- Create: `packages/core/src/assistant/draw-plan.ts`
- Test: `packages/core/src/assistant/draw-plan.test.ts`

**Interfaces:**
- Consumes: `HostOp` from `host-ops.ts`
- Produces: `export function opsForNewBoard(input: { name: string; text: string; width: number; height: number }): HostOp[]`

返回先 `createBoard`，再 `createText`。`createText.boardId` 固定为 `"$new"`，执行器在 `createBoard` 返回真实 id 后替换。

- [ ] **Step 1: Write the failing test**

```ts
import { opsForNewBoard } from "./draw-plan.js";

it("plans one board and one text child", () => {
  expect(opsForNewBoard({ name: "封面", text: "标题", width: 1920, height: 1080 })).toEqual([
    { op: "createBoard", name: "封面", width: 1920, height: 1080 },
    { op: "createText", boardId: "$new", name: "封面-标题", text: "标题", x: 120, y: 100, width: 880, height: 140 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/draw-plan.test.ts`
Expected: FAIL with `opsForNewBoard` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import type { HostOp } from "./host-ops.js";

export function opsForNewBoard(input: { name: string; text: string; width: number; height: number }): HostOp[] {
  return [
    { op: "createBoard", name: input.name, width: input.width, height: input.height },
    { op: "createText", boardId: "$new", name: `${input.name}-标题`, text: input.text, x: 120, y: 100, width: 880, height: 140 },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/draw-plan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/draw-plan.ts packages/core/src/assistant/draw-plan.test.ts
git commit -m "Plan one undoable board from a chapter."
```

### Task 2: 范围与冲突

**Files:**
- Create: `packages/core/src/assistant/apply-scope.ts`
- Test: `packages/core/src/assistant/apply-scope.test.ts`

**Interfaces:**
- Consumes: `allowWrite(intent: WriteIntent, snap: WriteGateSnapshot): boolean`，`HostOp`
- Produces:

```ts
export interface ApplyDecision {
  boardId: string;
  status: "drawn" | "failed" | "stopped" | "skipped_user_edit";
  ops: HostOp[];
}
export function decideApply(input: {
  boardId: string;
  intent: WriteIntent;
  snap: WriteGateSnapshot;
  cancelled: boolean;
  ops: HostOp[];
}): ApplyDecision
```

- [ ] **Step 1: Write the failing test**

```ts
import { decideApply } from "./apply-scope.js";
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

it("returns no ops when the revision changed under the user", () => {
  const decision = decideApply({
    boardId: "board-1",
    intent,
    snap: { ...snap, revision: 2 },
    cancelled: false,
    ops,
  });
  expect(decision.status).toBe("skipped_user_edit");
  expect(decision.ops).toEqual([]);
});

it("stops without ops when cancelled", () => {
  const decision = decideApply({ boardId: "board-1", intent, snap, cancelled: true, ops });
  expect(decision.status).toBe("stopped");
  expect(decision.ops).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/apply-scope.test.ts`
Expected: FAIL with `decideApply` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import { allowWrite } from "./write-gate.js";
import type { HostOp } from "./host-ops.js";
import type { WriteGateSnapshot, WriteIntent } from "./types.js";

export function decideApply(input: {
  boardId: string;
  intent: WriteIntent;
  snap: WriteGateSnapshot;
  cancelled: boolean;
  ops: HostOp[];
}): ApplyDecision {
  if (input.cancelled) return { boardId: input.boardId, status: "stopped", ops: [] };
  if (!allowWrite(input.intent, input.snap)) return { boardId: input.boardId, status: "skipped_user_edit", ops: [] };
  return { boardId: input.boardId, status: "drawn", ops: input.ops };
}
```

`ApplyDecision` 放在 `types.ts`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/apply-scope.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/apply-scope.ts packages/core/src/assistant/apply-scope.test.ts packages/core/src/assistant/types.ts
git commit -m "Skip writes that miss the mount or revision check."
```

### Task 3: 撤销边界

**Files:**
- Create: `apps/penpot-plugin/src/assistant/run-ops.ts`
- Test: `apps/penpot-plugin/src/assistant/run-ops.test.ts`

**Interfaces:**
- Consumes: `HostOp`
- Produces:

```ts
export interface PenpotHistory {
  undoBlockBegin(): symbol;
  undoBlockFinish(id: symbol): void;
}
export interface PenpotDrawApi {
  history: PenpotHistory;
  createBoard(): { id: string; appendChild(child: { id: string }): void };
  createText(text: string): { id: string };
}
export function runBoardOps(api: PenpotDrawApi, ops: HostOp[]): { boardId: string }
```

一次调用对 `undoBlockBegin` 和 `undoBlockFinish` 各调用一次。

- [ ] **Step 1: Write the failing test**

```ts
import { runBoardOps } from "./run-ops.js";

it("wraps one board in a single undo block", () => {
  const calls: string[] = [];
  const api = {
    history: {
      undoBlockBegin: () => {
        calls.push("begin");
        return Symbol("undo");
      },
      undoBlockFinish: () => {
        calls.push("finish");
      },
    },
    createBoard: () => {
      calls.push("board");
      return { id: "board-1", appendChild: () => calls.push("append") };
    },
    createText: () => {
      calls.push("text");
      return { id: "text-1" };
    },
  };
  const result = runBoardOps(api, [
    { op: "createBoard", name: "封面", width: 1920, height: 1080 },
    { op: "createText", boardId: "$new", name: "封面-标题", text: "标题", x: 120, y: 100, width: 880, height: 140 },
  ]);
  expect(result.boardId).toBe("board-1");
  expect(calls).toEqual(["begin", "board", "text", "append", "finish"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/assistant/run-ops.test.ts`
Expected: FAIL with `runBoardOps` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import type { HostOp } from "@canvory/core";

export function runBoardOps(api: PenpotDrawApi, ops: HostOp[]): { boardId: string } {
  const token = api.history.undoBlockBegin();
  let boardId = "";
  let board: { id: string; appendChild(child: { id: string }): void } | null = null;
  for (const op of ops) {
    if (op.op === "createBoard") {
      board = api.createBoard();
      boardId = board.id;
    } else if (op.op === "createText") {
      const text = api.createText(op.text);
      board?.appendChild(text);
    }
  }
  api.history.undoBlockFinish(token);
  return { boardId };
}
```

插件入口在执行前把 `globalThis.penpot` 收成 `PenpotDrawApi`。本任务不改 `plugin.ts` 的导出按钮行为。`packages/core/src/index.ts` 导出 `HostOp`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/assistant/run-ops.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/penpot-plugin/src/assistant/run-ops.ts apps/penpot-plugin/src/assistant/run-ops.test.ts packages/core/src/index.ts
git commit -m "Run one board's host operations inside one undo block."
```
