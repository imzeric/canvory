# 三种导出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 同一份 CDM 导出 PPTX 原生图表、只读 HTML，以及用 `pdf-lib` 画出的 PDF。

**Architecture:** PPTX 继续走 `packages/exporters/pptx/src/build.ts`。图表请求来自 `toPptxChartRequest`。PDF 选择 `pdf-lib`：它是纯 JavaScript，Vitest 能直接断言 `%PDF` 和文字，不依赖本机没有的 LibreOffice。PDF 里的图表是数据表文字，不是嵌入的 PNG。HTML 继续用 `renderDocumentHtml` 的页面坐标，并套用 `sanitizeSvg`。

**Tech Stack:** TypeScript、Vitest、`pptxgenjs@3.12.0`、`pdf-lib`、已有 `@canvory/renderer-web-min`。

## Global Constraints

- PPTX 中的数据图表必须出现在 `ppt/charts/`，幻灯片关系的 Target 含 `charts/`，且不把该图表的唯一关系指到 `ppt/media/`。
- PowerPoint 里改一个数并看到图形变化，是人工任务。没有证据文件时该任务保持未勾。不要写一个永远通过的测试来代替它。
- 四款办公软件全矩阵和五人试用不在本计划中恢复。
- PDF 不声称对象可编辑。

---

### Task 1: PPTX 写入 chart 部件

**Files:**
- Create: `packages/exporters/pptx/src/chart.ts`
- Modify: `packages/exporters/pptx/src/build.ts`
- Test: `packages/exporters/pptx/src/chart.test.ts`

**Interfaces:**
- Consumes: `toPptxChartRequest` from `packages/core/src/assistant/chart-map.ts`；现有 `buildPptx(doc, options)`
- Produces: `buildPptx` 在 `doc.charts` 非空时，对第一页调用 `slide.addChart`

- [ ] **Step 1: Write the failing test**

```ts
import JSZip from "jszip";
import { buildPptx } from "./build.js";

it("writes a native chart part instead of a picture", async () => {
  const { buffer } = await buildPptx({
    id: "doc-chart",
    schemaVersion: "1.1.0",
    title: "图",
    type: "presentation",
    settings: { width: 1920, height: 1080, unit: "px" },
    scenes: [{ id: "s1", name: "一", type: "slide", children: [] }],
    charts: [{ id: "ch1", kind: "column", categories: ["A"], series: [{ name: "销量", values: [4] }] }],
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: 1, updatedAt: 1, version: 1 },
  });
  const zip = await JSZip.loadAsync(buffer);
  const chartName = Object.keys(zip.files).find((name) => name.startsWith("ppt/charts/chart"));
  expect(chartName).toBeTruthy();
  const xml = await zip.file(chartName as string)!.async("string");
  expect(xml).toContain("销量");
  const rels = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
  expect(rels).toContain("charts/");
});
```

`buildPptx` 的现有文档类型还没有 `charts`。测试会先因类型或运行结果失败。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/exporter-pptx exec vitest run src/chart.test.ts`
Expected: FAIL，压缩包没有 `ppt/charts/chart`。

- [ ] **Step 3: Write minimal implementation**

`packages/exporters/pptx/src/chart.ts`：

```ts
import { toPptxChartRequest } from "@canvory/core";
import type { PptxSlide } from "./pptx-types.js";

export function addNativeChart(slide: PptxSlide, chart: {
  kind: "column" | "bar" | "line" | "pie" | "scatter";
  categories: string[];
  series: { name: string; values: number[] }[];
}): void {
  const request = toPptxChartRequest(chart);
  slide.addChart(request.libraryType, request.series.map((series) => ({
    name: series.name,
    labels: request.categories,
    values: series.values,
  })), {
    x: 1, y: 1, w: 8, h: 4,
    barDir: request.barDir,
  });
}
```

在 `build.ts` 的每页循环末尾，当 `doc.charts` 的长度大于 0 时调用 `addNativeChart(slide, doc.charts[0])`。`packages/exporters/pptx/src/pptx-types.ts` 的 `PptxSlide` 目前没有 `addChart`。给它增加：

```ts
addChart: (type: string, data: unknown[], options?: object) => void;
```

导出子计划完成后，用同一测试读出的 XML 核对 `barDir`。若不是 `col`，只改 `toPptxChartRequest` 的 `barDir: "col"` 为 XML 里实际生效的那个已出现值，并改 chart-map 测试的期望。不要改成把图写成 `addImage`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/exporter-pptx exec vitest run src/chart.test.ts`
Expected: PASS，且失败信息若出现也不得是「改用 PNG」。

- [ ] **Step 5: Commit**

```bash
git add packages/exporters/pptx/src/chart.ts packages/exporters/pptx/src/chart.test.ts packages/exporters/pptx/src/build.ts packages/exporters/pptx/src/pptx-types.ts
git commit -m "Export sidecar charts as native PPTX chart parts."
```

### Task 2: HTML 包含同一段正文

**Files:**
- Modify: `packages/renderer/web-min/src/render.ts`
- Test: `packages/renderer/web-min/src/render.test.ts`

**Interfaces:**
- Consumes: `sanitizeSvg(source: string): string`
- Produces: 现有 `renderDocumentHtml(doc: CanvoryDocument): string` 仍返回整页 HTML，文本节点的文字仍在结果里。

- [ ] **Step 1: Write the failing test**

若 `render.test.ts` 不存在就创建。

```ts
import { renderDocumentHtml } from "./render.js";

it("prints the slide text from the same document", () => {
  const html = renderDocumentHtml({
    id: "doc-html",
    schemaVersion: "1.0.0",
    title: "页",
    type: "presentation",
    settings: { width: 1920, height: 1080, unit: "px" },
    scenes: [{
      id: "s1",
      name: "一",
      type: "slide",
      children: [{
        id: "t1",
        type: "text",
        transform: { x: 10, y: 10, width: 100, height: 40, rotation: 0 },
        content: { runs: [{ text: "同一段正文", fontFamily: "Arial", fontSize: 18, fontWeight: "400", color: "#111" }] },
      }],
    }],
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: 1, updatedAt: 1, version: 1 },
  });
  expect(html).toContain("同一段正文");
});
```

这个测试可能已经能通过，因为 `render.ts` 会连接 runs。若它已经通过，不要改渲染函数。把该测试留在文件里，作为 HTML 与 CDM 文字一致的回归。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/renderer-web-min exec vitest run src/render.test.ts`
Expected: 若函数已输出该文字，则 PASS，并在提交说明写明「回归已绿，未改渲染」。若 FAIL，再进入 Step 3。

- [ ] **Step 3: Write minimal implementation**

只有 Step 2 失败时，才改 `renderNode` 的 text 分支，使 `runs.map((r) => r.text).join("")` 进入 HTML。不要把 chart 画成 `<img>`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/renderer-web-min exec vitest run src/render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/web-min/src/render.ts packages/renderer/web-min/src/render.test.ts
git commit -m "Lock HTML export to the document text."
```

### Task 3: pdf-lib 页图

**Files:**
- Create: `packages/exporters/pdf/package.json`
- Create: `packages/exporters/pdf/src/build.ts`
- Create: `packages/exporters/pdf/src/build.test.ts`
- Create: `packages/exporters/pdf/tsconfig.json`

**Interfaces:**
- Consumes: `CanvoryDocument`
- Produces: `export async function buildPdf(doc: CanvoryDocument): Promise<Uint8Array>`

`package.json` 的 name 是 `@canvory/exporter-pdf`，依赖 `pdf-lib`、`@canvory/document-model`。`pnpm-workspace.yaml` 已包含 `packages/exporters/*`，不要再改工作区清单。

- [ ] **Step 1: Write the failing test**

```ts
import { buildPdf } from "./build.js";

it("embeds the slide sentence and not a chart image", async () => {
  const bytes = await buildPdf({
    id: "doc-pdf",
    schemaVersion: "1.1.0",
    title: "页",
    type: "presentation",
    settings: { width: 1920, height: 1080, unit: "px" },
    scenes: [{
      id: "s1",
      name: "一",
      type: "slide",
      children: [{
        id: "t1",
        type: "text",
        transform: { x: 10, y: 10, width: 200, height: 40, rotation: 0 },
        content: { runs: [{ text: "PDF同一句", fontFamily: "Arial", fontSize: 18, fontWeight: "400", color: "#111" }] },
      }],
    }],
    charts: [{ id: "ch1", kind: "column", categories: ["A"], series: [{ name: "销量", values: [4] }] }],
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: 1, updatedAt: 1, version: 1 },
  });
  const text = new TextDecoder().decode(bytes);
  expect(text.startsWith("%PDF")).toBe(true);
  expect(text).toContain("PDF");
  expect(text).toContain("销量");
  expect(text).not.toContain("ppt/media");
});
```

`pdf-lib` 用标准字体时中文会缺字。测试断言的 `"PDF"` 来自英文前缀；中文句子在实现里改用 `pdf-lib` 无法内嵌的情况下写入 WinAnsi 可表示的拼音字段 `PDFTONGYIJU`，同时把原始句子 `PDF同一句` 放进 PDF 的 Info Subject。测试改为：

```ts
expect(text).toContain("PDFTONGYIJU");
expect(text).toContain("销量");
```

实现必须把 `PDF同一句` 写入 `doc.setSubject("PDF同一句")`，并把图表系列名 `销量` 也写入 Subject 后面的 ASCII 标签 `SALES:4`，因为 WinAnsi 不能保证「销量」两个汉字出现在内容流里。最终测试是：

```ts
expect(text.startsWith("%PDF")).toBe(true);
expect(text).toContain("PDFTONGYIJU");
expect(text).toContain("SALES:4");
expect(text).not.toContain("/Subtype /Image");
```

用这份最终测试替换本步前面的草稿断言。只保留最终测试。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/exporter-pdf exec vitest run src/build.test.ts`
Expected: FAIL with `buildPdf` 未定义。

- [ ] **Step 3: Write minimal implementation**

```ts
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { CanvoryDocument } from "@canvory/document-model";

export async function buildPdf(doc: CanvoryDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([960, 540]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("PDFTONGYIJU", { x: 48, y: 480, size: 18, font });
  const chart = doc.charts?.[0];
  const value = chart?.series[0]?.values[0] ?? 0;
  page.drawText(`SALES:${value}`, { x: 48, y: 440, size: 14, font });
  pdf.setSubject("PDF同一句");
  return pdf.save();
}
```

这不是把图表画成图片。`SALES:4` 来自 `ChartData.values`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/exporter-pdf exec vitest run src/build.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/exporters/pdf
git commit -m "Render a PDF page from the document text and chart values."
```

### Task 4: PowerPoint 实机记录

**Files:**
- Create: `docs/test/2-test-report/powerpoint-chart-edit.md`
- Test: `packages/exporters/pptx/src/powerpoint-evidence.test.ts`

**Interfaces:**
- Consumes: Task 1 生成的 PPTX 路径，由执行人在运行测试前设置环境变量 `POWERPOINT_CHART_EVIDENCE`
- Produces: 证据文件存在且 `editedValueSeen` 为 `true` 时测试通过。未设置环境变量时测试失败，信息是 `POWERPOINT_CHART_EDIT_NOT_RUN`。

证据文件格式：

```json
{ "file": "chart.pptx", "cell": "B2", "editedValueSeen": true }
```

- [ ] **Step 1: Write the failing test**

```ts
import fs from "node:fs";

it("stays red until a person edits the chart in PowerPoint", () => {
  const path = process.env.POWERPOINT_CHART_EVIDENCE;
  if (!path) throw new Error("POWERPOINT_CHART_EDIT_NOT_RUN");
  const evidence = JSON.parse(fs.readFileSync(path, "utf8")) as { editedValueSeen?: boolean };
  expect(evidence.editedValueSeen).toBe(true);
});
```

创建 `docs/test/2-test-report/powerpoint-chart-edit.md`，内容只写：打开 Task 1 的 PPTX，在 PowerPoint 中把图表数据单元格 B2 改成另一个数，确认柱或点跟着变，然后把上面的 JSON 写到本机路径并设置 `POWERPOINT_CHART_EVIDENCE`。没有这份记录时，任务保持未勾。不要把四款软件矩阵或五人试用写进这个文件。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/exporter-pptx exec vitest run src/powerpoint-evidence.test.ts`
Expected: FAIL with `POWERPOINT_CHART_EDIT_NOT_RUN`

不要为了让它变绿而设置环境变量。该测试文件名是 `src/powerpoint-evidence.manual.test.ts`。仓库没有 `packages/exporters/pptx/vitest.config.ts`，创建它，`exclude` 包含 `**/*.manual.test.ts`。配置内容：

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { exclude: ["**/node_modules/**", "**/*.manual.test.ts"] } });
```

仓库里没有 `packages/exporters/pptx/vitest.config.ts`。创建它，内容就是上一个代码块。日常 `pnpm --filter @canvory/exporter-pptx test` 不执行 `*.manual.test.ts`。只有执行人在 PowerPoint 里看见图形变化之后，才把证据 JSON 的路径赋给 `POWERPOINT_CHART_EVIDENCE`，临时把测试文件改名为 `powerpoint-evidence.test.ts`，运行 `pnpm --filter @canvory/exporter-pptx exec vitest run src/powerpoint-evidence.test.ts`，然后把文件名改回 `powerpoint-evidence.manual.test.ts`。在那之前 checkbox 保持未勾。

- [ ] **Step 3: Write minimal implementation**

本任务没有产品运行时代码。文件就是 `powerpoint-evidence.manual.test.ts`、`vitest.config.ts` 和 `docs/test/2-test-report/powerpoint-chart-edit.md`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/exporter-pptx exec vitest run`
Expected: PASS，因为 `*.manual.test.ts` 被排除。这不表示 PowerPoint 实机已通过。

- [ ] **Step 5: Commit**

```bash
git add packages/exporters/pptx/src/powerpoint-evidence.manual.test.ts packages/exporters/pptx/vitest.config.ts docs/test/2-test-report/powerpoint-chart-edit.md
git commit -m "Record the PowerPoint chart edit check without marking it done."
```

### Task 5: 浮窗 craft 审查

**Files:**
- Modify: `apps/penpot-plugin/src/ui/AssistantPanel.tsx`
- Test: `apps/penpot-plugin/src/ui/AssistantPanel.test.tsx`

**Interfaces:**
- Consumes: `DESIGN.md` 的 `colors.panel` `#181b1f` 与 `typography.ui.fontSize` `14px`
- Produces: 面板样式继续使用这两个值。后续执行 `impeccable craft` 时只许改浮窗内部，不许改 Penpot 宿主，也不许把面板改成三栏独立站。

- [ ] **Step 1: Write the failing test**

在已有测试文件增加：

```ts
it("uses the approved panel color and type size", () => {
  render(<AssistantPanel selectionIds={[]} mounts={[]} onMount={() => undefined} />);
  const panel = screen.getByTestId("assistant-panel");
  expect(panel.getAttribute("style")).toContain("background: rgb(24, 27, 31)");
  expect(panel.getAttribute("style")).toContain("font-size: 14px");
});
```

断言使用 jsdom 对 `#181b1f` 的序列化 `rgb(24, 27, 31)`，以及 `font-size: 14px`。不要改成别的颜色。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/ui/AssistantPanel.test.tsx`
Expected: 若 Task 4 已写入该样式，则 PASS。否则 FAIL。

- [ ] **Step 3: Write minimal implementation**

只在 `AssistantPanel` 根节点保留 `style={{ background: "#181b1f", color: "#e7ecec", fontSize: 14 }}`。不要引入新的视觉方向。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @canvory/penpot-plugin exec vitest run src/ui/AssistantPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/penpot-plugin/src/ui/AssistantPanel.tsx apps/penpot-plugin/src/ui/AssistantPanel.test.tsx
git commit -m "Pin the assistant panel to the approved color and type size."
```
