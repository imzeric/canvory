# 模板、图表与配图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 PPTX 主题 XML 取出外观并丢弃正文；用 `ChartData` 映射到 `pptxgenjs` 的 chart 类型；净化 SVG，并在不能拆成简单形状时拒绝静默截图。

**Architecture:** 解析函数不读网络。图表类型映射是纯函数，真正的 `addChart` 调用在导出子计划。

**Tech Stack:** TypeScript、Vitest、`pptxgenjs@3.12.0` 的 `CHART_NAME`。

## Global Constraints

- 模板结果不含幻灯片正文。
- `column` 与 `bar` 都映射到库类型 `bar`。`barDir` 只允许测试断言过的 `"col"` 与 `"bar"`；若生成的 chart XML 不是这两个值，测试失败并改映射，不猜测第三种字符串。
- `kind: "png"` 的导出动作是 `replace-image`。它不是 chart。
- SVG 含 `<script` 时净化后不得再含该子串。
- 不能拆成不超过 8 个点的折线时，`exportDecision` 为 `block`，不是 `raster`。

---

### Task 1: 模板提取

**Files:**
- Create: `packages/core/src/assistant/template.ts`
- Test: `packages/core/src/assistant/template.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:

```ts
export interface ExtractedTemplate {
  fontNames: string[];
  colors: string[];
  background: string | null;
  layouts: { name: string; boxes: { kind: "title" | "body" | "picture"; x: number; y: number; width: number; height: number }[] }[];
}
export function extractTemplateFromThemeXml(themeXml: string, layoutXml: string): ExtractedTemplate
```

- [ ] **Step 1: Write the failing test**

```ts
import { extractTemplateFromThemeXml } from "./template.js";

it("drops sample body text and keeps the font and color", () => {
  const theme = `<a:theme><a:majorFont><a:latin typeface="Source Han Sans SC"/></a:majorFont><a:srgbClr val="1D4E89"/></a:theme>`;
  const layout = `<p:sp><p:ph type="title"/></p:sp><a:t>不要导入这段原正文</a:t>`;
  const result = extractTemplateFromThemeXml(theme, layout);
  expect(result.fontNames).toEqual(["Source Han Sans SC"]);
  expect(result.colors).toEqual(["#1D4E89"]);
  expect(JSON.stringify(result)).not.toContain("不要导入这段原正文");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/template.test.ts`
Expected: FAIL with `extractTemplateFromThemeXml` 未定义。

- [ ] **Step 3: Write minimal implementation**

用正则读取 `typeface="..."` 与 `srgbClr val="..."`。布局里只记录 `p:ph type="title"|"body"|"pic"` 的个数，框位置先写 `{ x: 120, y: 100, width: 1600, height: 120 }` 给 title，body 为 `{ x: 120, y: 280, width: 1600, height: 400 }`，picture 为 `{ x: 120, y: 720, width: 640, height: 360 }`。不要把 `<a:t>` 的文本放进返回值。

```ts
export function extractTemplateFromThemeXml(themeXml: string, layoutXml: string): ExtractedTemplate {
  const fontNames = [...themeXml.matchAll(/typeface="([^"]+)"/g)].map((match) => match[1] ?? "").filter(Boolean);
  const colors = [...themeXml.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)].map((match) => `#${(match[1] ?? "").toUpperCase()}`);
  const boxes = [];
  if (layoutXml.includes(`type="title"`)) boxes.push({ kind: "title" as const, x: 120, y: 100, width: 1600, height: 120 });
  if (layoutXml.includes(`type="body"`)) boxes.push({ kind: "body" as const, x: 120, y: 280, width: 1600, height: 400 });
  if (layoutXml.includes(`type="pic"`)) boxes.push({ kind: "picture" as const, x: 120, y: 720, width: 640, height: 360 });
  return { fontNames, colors, background: null, layouts: [{ name: "extracted", boxes }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/template.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/template.ts packages/core/src/assistant/template.test.ts
git commit -m "Extract template appearance and drop original body text."
```

### Task 2: 图表类型映射

**Files:**
- Create: `packages/core/src/assistant/chart-map.ts`
- Test: `packages/core/src/assistant/chart-map.test.ts`

**Interfaces:**
- Consumes: CDM `charts[].kind`：`"column" | "bar" | "line" | "pie" | "scatter"`
- Produces:

```ts
export interface PptxChartRequest {
  libraryType: "bar" | "line" | "pie" | "scatter";
  barDir?: "col" | "bar";
  categories: string[];
  series: { name: string; values: number[] }[];
}
export function toPptxChartRequest(chart: { kind: "column" | "bar" | "line" | "pie" | "scatter"; categories: string[]; series: { name: string; values: number[] }[] }): PptxChartRequest
```

- [ ] **Step 1: Write the failing test**

```ts
import { toPptxChartRequest } from "./chart-map.js";

it("maps a column chart to a native bar chart with column direction", () => {
  expect(toPptxChartRequest({
    kind: "column",
    categories: ["A"],
    series: [{ name: "S", values: [2] }],
  })).toEqual({
    libraryType: "bar",
    barDir: "col",
    categories: ["A"],
    series: [{ name: "S", values: [2] }],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/chart-map.test.ts`
Expected: FAIL with `toPptxChartRequest` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
export function toPptxChartRequest(chart: {
  kind: "column" | "bar" | "line" | "pie" | "scatter";
  categories: string[];
  series: { name: string; values: number[] }[];
}): PptxChartRequest {
  if (chart.kind === "column") return { libraryType: "bar", barDir: "col", categories: chart.categories, series: chart.series };
  if (chart.kind === "bar") return { libraryType: "bar", barDir: "bar", categories: chart.categories, series: chart.series };
  return { libraryType: chart.kind, categories: chart.categories, series: chart.series };
}
```

导出子计划用生成文件核对 `barDir`。本任务只锁映射。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/chart-map.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/chart-map.ts packages/core/src/assistant/chart-map.test.ts
git commit -m "Map sidecar chart kinds to pptxgenjs chart types."
```

### Task 3: 图源与净化

**Files:**
- Create: `packages/core/src/assistant/figure.ts`
- Test: `packages/core/src/assistant/figure.test.ts`

**Interfaces:**
- Consumes: `SIMPLE_PATH_MAX_POINTS` from `@canvory/shared`
- Produces:

```ts
export interface FigureRecord {
  id: string;
  kind: "mermaid" | "antv" | "svg" | "png";
  source: string;
  caption: string;
}
export function sanitizeSvg(source: string): string
export function exportDecision(figure: FigureRecord, pointCount: number): "shapes" | "block" | "replace-image"
```

`png` 返回 `replace-image`。`pointCount > 8` 返回 `block`。`pointCount <= 8` 且 kind 不是 `png` 返回 `shapes`。

- [ ] **Step 1: Write the failing test**

```ts
import { exportDecision, sanitizeSvg } from "./figure.js";

it("strips script from svg source", () => {
  expect(sanitizeSvg(`<svg><script>alert(1)</script><rect /></svg>`)).not.toContain("<script");
});

it("blocks a complex figure instead of rasterizing it", () => {
  expect(exportDecision({ id: "f1", kind: "mermaid", source: "graph TD; A-->B", caption: "流程" }, 9)).toBe("block");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/figure.test.ts`
Expected: FAIL with `sanitizeSvg` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import { SIMPLE_PATH_MAX_POINTS } from "@canvory/shared";

export function sanitizeSvg(source: string): string {
  return source.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export function exportDecision(figure: FigureRecord, pointCount: number): "shapes" | "block" | "replace-image" {
  if (figure.kind === "png") return "replace-image";
  if (pointCount > SIMPLE_PATH_MAX_POINTS) return "block";
  return "shapes";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/core exec vitest run src/assistant/figure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/assistant/figure.ts packages/core/src/assistant/figure.test.ts
git commit -m "Keep figure source and block silent raster export."
```
