# Penpot AI PPT 总实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Penpot 2.4.3 官方插件浮窗里，把需求与资料画成可编辑 Board，并导出带原生 chart 的 PPTX、HTML 和 PDF。

**Architecture:** 纯函数放在 `packages/core/src/assistant/`，文档字段放在 `packages/document-model`，浮窗放在 `apps/penpot-plugin`，生成与资料放在 `apps/server/src/assistant/`，PPTX 图表放在 `packages/exporters/pptx`，PDF 使用新建的 `packages/exporters/pdf`。插件只执行白名单操作。当前文件 id 不匹配时不写画布。

**Tech Stack:** TypeScript、Vitest、现有 NestJS、`pptxgenjs@3.12.0`、`pdf-lib`（PDF 选择理由见导出子计划）、Penpot 插件 API 2.4.3、React 18（插件现有 UI，不新选型）。

## Global Constraints

- 宿主是 Penpot 2.4.3。`penpot.ui.open` 只创建 `plugin-modal`。不改 Penpot 前端，不做停靠侧栏，不做独立网页向导。
- 一个文件是一份演示稿，一个 Page 承载全部幻灯片，一个 Board（`:frame`）是一张幻灯片。Root Frame `00000000-0000-0000-0000-000000000000` 不是幻灯片。
- 当前 `currentFile.id` 是会话边界。换文件或 `finish` 后不得写入旧画布。
- 写入前核对文件 id、Board id、`pluginData` 修订号。未挂载的 Board 不写。
- 模型只返回 JSON 白名单操作，不执行任意代码。用户资料不进入系统提示。
- `CANVORY_MODEL_PROVIDER` 与 `CANVORY_MODEL_API_KEY` 未设置时拒绝生成。测试里的 `MockModelProvider` 不是真实验收。
- 模板只留字体名、色板、背景、版式框，丢弃原页正文。
- 数据图表用 sidecar 的 `ChartData` 调 `addChart`。PNG 与 SVG 预览不能充当 chart 部件。PowerPoint 改数据的实机记录未完成则该任务保持未勾。四软件全矩阵和五人试用维持豁免，不新增任务去恢复它们。
- 旧 CDM `schemaVersion` `1.0.0` 仍能解析。新字段只在 `1.1.0` 出现且可缺省。
- 视觉以已批准的 `DESIGN.md` 为准：浮窗底 `#181b1f`，字号 14px，中文黑体栈。`craft` 只在浮窗任务里引用这些令牌，不重开视觉方向。
- 本文件和子计划被批准前，不创建这些路径上的实现文件。

---

## 执行顺序

| 顺序 | 计划 | 可与谁并行 |
|---|---|---|
| 1 | `2026-11-18-penpot-ai-ppt-session-plan.md` | 无。它定义全体共用的类型 |
| 2 | `2026-11-18-penpot-ai-ppt-generation-plan.md` | 与 3 并行，都只消费顺序 1 的类型 |
| 3 | `2026-11-18-penpot-ai-ppt-draw-plan.md` | 与 2 并行 |
| 4 | `2026-11-18-penpot-ai-ppt-template-chart-figure-plan.md` | 在 1 之后。图表导出依赖它的 `ChartData` |
| 5 | `2026-11-18-penpot-ai-ppt-export-plan.md` | 在 4 之后。HTML 可与 PDF 任务并行，但都在 chart 结构测试之后 |

不并行的原因：顺序 2 和 3 若同时改 `packages/core/src/assistant/types.ts` 会冲突。该文件只在顺序 1 创建，之后只读。

## 首个可用纵切

完成 session 计划的全部任务后，浮窗可以在无模型密钥时打开，显示 PPT 模式，把选区与挂载集分开，并把挂载集按文件 id 存进可序列化的 `FileSession`。此时还没有画板生成，也没有 chart。这不是六步完成。

## 覆盖矩阵

| 规格要求 | 子计划任务 |
|---|---|
| 官方浮窗，不改宿主 | session 计划 Task 4 |
| 选区不改挂载，未挂载不写 | session 计划 Task 2、Task 3 |
| 关浮窗再打开同一文件能读回 | session 计划 Task 3 |
| 换文件失去写入权 | session 计划 Task 2 |
| 写入前重验文件、画板、修订号 | session 计划 Task 2；draw 计划 Task 2 |
| 需求与资料分块，无密钥不生成 | generation 计划 Task 1、Task 2 |
| 提示注入隔离 | generation 计划 Task 4 |
| 只执行白名单操作 | generation 计划 Task 3 |
| 逐张 Board 与一次撤销边界 | draw 计划 Task 1、Task 3 |
| 取消、局部失败、跳过手改 | draw 计划 Task 2 |
| 模板无正文 | template 计划 Task 1 |
| 原生 chart，不用图片冒充 | template 计划 Task 2；export 计划 Task 1 |
| PowerPoint 改数据实机 | export 计划 Task 4，默认保持未勾 |
| Mermaid/AntV 源、净化、不静默截图 | template 计划 Task 3 |
| PNG 不结构化编辑 | template 计划 Task 3 的 kind 分支 |
| HTML 与 PDF 同一文字 | export 计划 Task 2、Task 3 |
| `DESIGN.md` 令牌 | session 计划 Task 4 |
| 1.0.0 文档仍可读 | session 计划 Task 1 |

## 里程碑

1. 浮窗与文件会话可测。没有生成。
2. 生成协议可测。mock 只在测试注册。
3. 绘制闸门可测。不写非活动文件。
4. 模板、图表数据、图源可测。chart 仍未在 PowerPoint 里点过。
5. 三种导出可测。PPTX 结构测试通过仍不够，Task 4 的实机记录未勾则 chart 承诺未完成。

## 用户运行前必须配置

- `CANVORY_MODEL_PROVIDER`：供应商模块名。空则生成接口返回 503，文案 `MODEL_PROVIDER_UNCONFIGURED`。
- `CANVORY_MODEL_API_KEY`：该供应商的密钥。空则同样 503。不写入文档，不写入日志。
- PowerPoint 实机验收需要一台能打开 PPTX 的 PowerPoint。仓库不安装它，也不把缺失记成豁免。

不需要用户选择 React 或 PDF 库。PDF 使用 `pdf-lib`，理由在导出子计划的 Architecture。
