# 会话与浮窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 定义 1.1.0 可选字段、文件会话和写入闸门，并让插件浮窗把选区与挂载集分开。

**Architecture:** 类型和纯函数在 `packages/core`。CDM 解析在 `packages/document-model`。浮窗是现有 React 插件里的新面板，仍由 `penpot.ui.open` 打开。

**Tech Stack:** TypeScript、Vitest、Zod、React 18。

## 实测进度

只记录 M1。M2–M5 没有实现。

2026-11-18，分支 `song/m1-penpot-session-7484`，基线 `6f55197ffbd5d335b902378db12028880a8842ab`：

- `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均退出码 0。
- 有断言的测试 41 个：document-model 4、core 10、exporter-pptx 3、server 9、penpot-plugin 15。审查修复后复测，四条命令退出码仍为 0。
- Penpot 2.4.3 官方浮窗里，PPT 模式显示「尚未配置模型，不能生成画板。」，「绘制」为禁用。选中画板「文本」后挂载；关闭并重新打开后挂载名仍在，当前选区为空。
- 明细：`docs/test/2-test-report/m1-session.md`。

## Global Constraints

- 不修改 Penpot 仓库。浮窗是 `plugin-modal`。
- `schemaVersion` `1.0.0` 继续被 `parseCanvoryDocument` 接受。
- 挂载集只因显式添加、移除、锁定而变，不因 `selectionchange` 而变。
- `allowWrite` 在文件 id、页 id、画板存在性或修订号任一不符时返回 `false`。

---

### Task 1: CDM 1.1.0 可选字段

**Files:**
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/document-model/src/schema.ts`
- Test: `packages/document-model/src/schema.test.ts`

**Interfaces:**
- Consumes: 现有 `parseCanvoryDocument(input: unknown): CanvoryDocument`
- Produces: `export const SUPPORTED_CDM_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const`。`parseCanvoryDocument` 对这两个版本都返回文档。1.1.0 可带 `outline`、`charts`，缺省为 `[]`。

- [ ] **Step 1: Write the failing test**

在 `packages/document-model/src/schema.test.ts` 增加：

```ts
import { parseCanvoryDocument } from "./schema.js";

const base = {
  id: "doc-1",
  title: "旧文档",
  type: "presentation",
  settings: { width: 1920, height: 1080, unit: "px" },
  scenes: [{ id: "s1", name: "一", type: "slide", children: [] }],
  assets: [],
  animations: [],
  interactions: [],
  metadata: { createdAt: 1, updatedAt: 1, version: 1 },
};

it("accepts a 1.0.0 document without assistant fields", () => {
  const doc = parseCanvoryDocument({ ...base, schemaVersion: "1.0.0" });
  expect(doc.schemaVersion).toBe("1.0.0");
});

it("accepts a 1.1.0 document with an outline and a chart", () => {
  const doc = parseCanvoryDocument({
    ...base,
    schemaVersion: "1.1.0",
    outline: [{ id: "c1", title: "封面", body: "你好", status: "pending" }],
    charts: [{ id: "ch1", kind: "column", categories: ["A"], series: [{ name: "S", values: [1] }] }],
  });
  expect(doc.outline?.[0]?.title).toBe("封面");
  expect(doc.charts?.[0]?.kind).toBe("column");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/document-model exec vitest run src/schema.test.ts`
Expected: FAIL，`outline` 或 `charts` 未被类型或解析接受，或 1.1.0 抛 `SCHEMA_UNSUPPORTED`。

- [ ] **Step 3: Write minimal implementation**

`packages/shared/src/constants.ts` 保留 `SUPPORTED_CDM_SCHEMA_VERSION = "1.0.0"`，并增加：

```ts
export const SUPPORTED_CDM_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const;
```

`packages/document-model/src/schema.ts` 的 `canvoryDocumentSchema` 增加可选字段：

```ts
outline: z.array(z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  status: z.enum(["pending", "drawing", "drawn", "failed", "stopped", "skipped_user_edit"]),
})).optional(),
charts: z.array(z.object({
  id: z.string(),
  kind: z.enum(["column", "bar", "line", "pie", "scatter"]),
  categories: z.array(z.string()),
  series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
})).optional(),
```

`parseCanvoryDocument` 把版本检查改为：

```ts
if (!SUPPORTED_CDM_SCHEMA_VERSIONS.includes(parsed.data.schemaVersion as "1.0.0" | "1.1.0")) {
  throw new CanvoryError("SCHEMA_UNSUPPORTED", `SCHEMA_UNSUPPORTED：不支持的 schemaVersion ${parsed.data.schemaVersion}`, 400);
}
```

`packages/document-model/src/types.ts` 的 `CanvoryDocument` 增加可选 `outline?` 与 `charts?`，字段与上面的 Zod 对象一致。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/document-model exec vitest run src/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants.ts packages/document-model/src/schema.ts packages/document-model/src/types.ts packages/document-model/src/schema.test.ts
git commit -m "Accept CDM 1.1.0 outline and chart fields."
```

### Task 2: 写入闸门

**Files:**
- Create: `packages/core/src/assistant/types.ts`
- Create: `packages/core/src/assistant/write-gate.ts`
- Test: `packages/core/src/assistant/write-gate.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:

```ts
export interface WriteIntent {
  fileId: string;
  pageId: string;
  boardId: string;
  expectedRevision: number;
  mountedBoardIds: string[];
  lockedBoardIds: string[];
}
export interface WriteGateSnapshot {
  currentFileId: string | null;
  currentPageId: string | null;
  boardExists: boolean;
  revision: number;
}
export function allowWrite(intent: WriteIntent, snap: WriteGateSnapshot): boolean
```

- [ ] **Step 1: Write the failing test**

```ts
import { allowWrite } from "./write-gate.js";

const intent = {
  fileId: "file-a",
  pageId: "page-a",
  boardId: "board-1",
  expectedRevision: 3,
  mountedBoardIds: ["board-1"],
  lockedBoardIds: [],
};

it("refuses a write when the open file changed", () => {
  expect(allowWrite(intent, {
    currentFileId: "file-b",
    currentPageId: "page-a",
    boardExists: true,
    revision: 3,
  })).toBe(false);
});

it("refuses a board that is not mounted", () => {
  expect(allowWrite({ ...intent, boardId: "board-9" }, {
    currentFileId: "file-a",
    currentPageId: "page-a",
    boardExists: true,
    revision: 3,
  })).toBe(false);
});

it("allows a mounted unlocked board when file, page, and revision match", () => {
  expect(allowWrite(intent, {
    currentFileId: "file-a",
    currentPageId: "page-a",
    boardExists: true,
    revision: 3,
  })).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/write-gate.test.ts`
Expected: FAIL with `allowWrite` 未定义。

- [ ] **Step 3: Write minimal implementation**

`packages/core/src/assistant/write-gate.ts`：

```ts
import type { WriteGateSnapshot, WriteIntent } from "./types.js";

export function allowWrite(intent: WriteIntent, snap: WriteGateSnapshot): boolean {
  if (snap.currentFileId !== intent.fileId) return false;
  if (snap.currentPageId !== intent.pageId) return false;
  if (!snap.boardExists) return false;
  if (snap.revision !== intent.expectedRevision) return false;
  if (!intent.mountedBoardIds.includes(intent.boardId)) return false;
  if (intent.lockedBoardIds.includes(intent.boardId)) return false;
  return true;
}
```

把 `WriteIntent` 与 `WriteGateSnapshot` 放在 `types.ts` 并从此文件再导出。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/write-gate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/types.ts packages/core/src/assistant/write-gate.ts packages/core/src/assistant/write-gate.test.ts
git commit -m "Gate canvas writes on file, board, and revision."
```

### Task 3: 文件会话序列化

**Files:**
- Create: `packages/core/src/assistant/session.ts`
- Test: `packages/core/src/assistant/session.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:

```ts
export interface MountRecord { boardId: string; name: string; locked: boolean }
export interface FileSession {
  fileId: string;
  pageId: string;
  revision: number;
  mounts: MountRecord[];
  materialIds: string[];
}
export function parseFileSession(input: unknown): FileSession
export function sessionForFile(stored: FileSession | null, fileId: string, pageId: string): FileSession
```

`sessionForFile` 在 `stored.fileId` 不同或 `stored` 为空时返回空挂载和空资料，不复制旧文件的名单。

- [ ] **Step 1: Write the failing test**

```ts
import { parseFileSession, sessionForFile } from "./session.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/session.test.ts`
Expected: FAIL with `parseFileSession` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";

const sessionSchema = z.object({
  fileId: z.string(),
  pageId: z.string(),
  revision: z.number().int().nonnegative(),
  mounts: z.array(z.object({
    boardId: z.string(),
    name: z.string(),
    locked: z.boolean(),
  })),
  materialIds: z.array(z.string()),
});

export function parseFileSession(input: unknown): FileSession {
  return sessionSchema.parse(input);
}

export function sessionForFile(stored: FileSession | null, fileId: string, pageId: string): FileSession {
  if (!stored || stored.fileId !== fileId) {
    return { fileId, pageId, revision: 0, mounts: [], materialIds: [] };
  }
  return { ...stored, pageId };
}
```

类型 `FileSession`、`MountRecord` 写在 `types.ts`，`session.ts` 从那里导入。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/types.ts packages/core/src/assistant/session.ts packages/core/src/assistant/session.test.ts
git commit -m "Keep assistant session bound to one Penpot file."
```

### Task 4: 浮窗面板

**Files:**
- Create: `apps/penpot-plugin/src/ui/AssistantPanel.tsx`
- Create: `apps/penpot-plugin/src/ui/AssistantPanel.test.tsx`
- Modify: `apps/penpot-plugin/src/ui/App.tsx`

**Interfaces:**
- Consumes: `MountRecord` from `packages/core/src/assistant/types.ts`
- Produces: `export function AssistantPanel(props: { selectionIds: string[]; mounts: MountRecord[]; onMount: (id: string) => void }): JSX.Element`

面板根节点 `data-testid="assistant-panel"` 的背景为 `#181b1f`。按钮「挂载当前选区」把 `selectionIds[0]` 交给 `onMount`。已有挂载名单不因新的 `selectionIds` 自己变化。

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AssistantPanel } from "./AssistantPanel.js";

function Harness() {
  const [mounts, setMounts] = useState<{ boardId: string; name: string; locked: boolean }[]>([]);
  const [selectionIds, setSelectionIds] = useState(["board-1"]);
  return (
    <>
      <button type="button" onClick={() => setSelectionIds(["board-2"])}>改选区</button>
      <AssistantPanel
        selectionIds={selectionIds}
        mounts={mounts}
        onMount={(id) => setMounts([{ boardId: id, name: id, locked: false }])}
      />
    </>
  );
}

it("does not change mounts when only the selection changes", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "挂载当前选区" }));
  await userEvent.click(screen.getByRole("button", { name: "改选区" }));
  expect(screen.getByTestId("mount-list").textContent).toContain("board-1");
  expect(screen.getByTestId("mount-list").textContent).not.toContain("board-2");
});
```

`apps/penpot-plugin/package.json` 目前没有 Testing Library。本任务在 Step 3 之前安装 `@testing-library/react`、`@testing-library/user-event` 和 `jsdom`，并新建 `apps/penpot-plugin/vitest.config.ts`，内容为 `defineConfig({ test: { environment: "jsdom" } })`。安装命令：

```bash
pnpm --filter @canvory/penpot-plugin add -D @testing-library/react @testing-library/user-event jsdom
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/ui/AssistantPanel.test.tsx`
Expected: FAIL，找不到 `AssistantPanel`。

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { MountRecord } from "@canvory/core";

export function AssistantPanel(props: {
  selectionIds: string[];
  mounts: MountRecord[];
  onMount: (id: string) => void;
}) {
  return (
    <section data-testid="assistant-panel" style={{ background: "#181b1f", color: "#e7ecec", fontSize: 14 }}>
      <p>PPT</p>
      <ul data-testid="mount-list">
        {props.mounts.map((mount) => <li key={mount.boardId}>{mount.name}</li>)}
      </ul>
      <button type="button" onClick={() => {
        const id = props.selectionIds[0];
        if (id) props.onMount(id);
      }}>挂载当前选区</button>
    </section>
  );
}
```

`App.tsx` 增加第三个标签「助手」，渲染 `AssistantPanel`。现有「导出」「预检」标签保留。在已有的 `packages/core/src/index.ts` 末尾增加：

```ts
export type { MountRecord } from "./assistant/types.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/ui/AssistantPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/penpot-plugin packages/core/src/index.ts packages/core/package.json
git commit -m "Add the PPT assistant panel without coupling mounts to selection."
```
