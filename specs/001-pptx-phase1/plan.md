# Implementation Plan: 第一阶段 PPTX 导出闭环

**Branch**: `001-pptx-phase1` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pptx-phase1/spec.md`

## Summary

交付第一阶段可商用的 **Penpot → CDM → PPTX** 闭环：统一文档模型、提取适配、三模式导出、预检/降级报告、字体映射（不嵌入）、文档版本恢复、后台导出任务，以及最小 HTML 只读护栏（架构验收 A/B）。浏览器与 Worker 共用同一套 CDM→PPTX 核心；Penpot 仅作 Source Adapter。

## Technical Context

**Language/Version**: TypeScript 5.x（严格模式），Node.js 20 LTS

**Primary Dependencies**: pnpm + Turborepo；Penpot Plugin API；PptxGenJS（PPTX 生成）；NestJS（API + Worker 宿主）；BullMQ + Redis/Valkey（导出队列）；Zod（CDM 校验）

**Storage**: PostgreSQL（项目/文档元数据、文档 JSONB、版本索引、导出任务）；对象存储 MinIO/S3（资源与导出产物）；本地/浏览器临时 Blob（浏览器导出）

**Testing**: Vitest（单元/契约）；黄金样例回归；跨软件兼容手工/半自动矩阵；Playwright 可选用于 HTML 只读核对

**Target Platform**: 自托管内网：浏览器插件（Penpot 内）+ NestJS 服务 + Worker；兼容 macOS/Windows 办公软件打开 PPTX

**Project Type**: TypeScript Monorepo 模块化单体（apps + packages），非微服务

**Performance Goals**: ≤20 页浏览器导出 ≤30s；>20 页默认建议后台；浏览器已用时 ≥25s 仍未完成则提示改走后台

**Constraints**: CDM 不得以 PPTX/Penpot 为唯一结构；栅格化结果不得回写为 CDM 唯一真相；不嵌入字体；混尺寸拒绝导出；中文用户文案；同一发布包含版本+后台任务

**Scale/Scope**: 第一阶段单团队/内网；黄金样例约 20 页级；文档主体 JSONB 整存，非每节点一行

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 计划体现 |
|------|------|----------|
| I. CDM 优先 | PASS | `packages/document-model` 为唯一导出输入；Penpot 只经 Adapter |
| II. 内容/表现/运行分层 | PASS | 动画/交互仅占位字段；导出不持久化运行时对象 |
| III. 统一创作多种输出 | PASS | PPTX Exporter + 最小 HTML Renderer 同读 CDM；栅格化不回写 CDM |
| IV. 编辑器与模型解耦 | PASS | `packages/adapters/penpot` 可替换；不改 Penpot 源码 |
| V. 中文优先 | PASS | 预检/报告/错误文案简体中文；标识符英文 |
| VI. 架构可验证 | PASS | quickstart 含验收 A/B；质量门槛对齐 SC-* |
| 模块化单体 / 包边界 | PASS | 见下方结构；不拆微服务 |
| 资源 ID 引用 | PASS | Asset 表 + 对象存储；节点持 assetId |

**Post-design re-check**: PASS — data-model / contracts 均以 CDM 为中心；export API 消费文档快照而非 Penpot 原始树。

## Project Structure

### Documentation (this feature)

```text
specs/001-pptx-phase1/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cdm-schema.md
│   ├── export-api.md
│   ├── penpot-adapter.md
│   └── preflight-report.md
└── tasks.md                 # /speckit-tasks 生成
```

### Source Code (repository root)

```text
canvory/
├── apps/
│   ├── penpot-plugin/          # 预检 UI、范围/模式选择、浏览器导出、任务提交
│   ├── server/                 # NestJS：文档、版本、资源、导出任务 API
│   ├── workers/                # PPTX 导出 Worker（消费队列）
│   └── viewer-min/             # 最小 HTML 只读（架构验收）
├── packages/
│   ├── document-model/         # CDM 类型、schemaVersion、Zod/校验、样例
│   ├── core/                   # 几何/单位、降级判定、字体映射、预检聚合
│   ├── exporters/
│   │   └── pptx/               # CDM → PPTX（浏览器与 Node 共用）
│   ├── renderer/
│   │   └── web-min/            # 最小只读渲染
│   ├── adapters/
│   │   └── penpot/             # Penpot 形状树 → CDM
│   └── shared/                 # 错误码、中文文案键、常量（20 页/30s）
├── fixtures/
│   └── golden/                 # 黄金样例 CDM + 期望报告摘要
├── infrastructure/
│   ├── docker/                 # Penpot、Postgres、Redis、MinIO、server/worker
│   └── nginx/
└── docs/
```

**Structure Decision**: 采用架构文档第九章 Monorepo 裁剪版——第一阶段不建完整 Studio；以 `penpot-plugin` + `server`/`workers` + 核心 packages 交付。Viewer 仅最小只读，不做发布产品化。

**Analyze 补丁（2026-11-17）**: Docker 须实际接入 Penpot（非仅占位）；Asset 上传/下载为 Worker 导出前置；发布门禁 ≠ US1 demo（见 tasks Demo vs Release）。

## Complexity Tracking

> 无宪法违规项；本表留空。
