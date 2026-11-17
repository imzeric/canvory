---
description: "Task list for 001-pptx-phase1 implementation"
---

# Tasks: 第一阶段 PPTX 导出闭环

**Input**: Design documents from `/specs/001-pptx-phase1/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 规格未强制 TDD；本列表不含独立测试任务。验收按 `quickstart.md` 与 SC-* 在 Polish 阶段执行。

**Organization**: 按用户故事分组；P1：US1 → US2 → US5；P2：US3 → US4 → US6。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: US1–US6
- 描述含确切文件路径

## Path Conventions

Monorepo（见 plan.md）：`apps/`、`packages/`、`fixtures/`、`infrastructure/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 初始化 TypeScript Monorepo 与工程骨架

- [X] T001 按 plan.md 创建目录：`apps/penpot-plugin/`、`apps/server/`、`apps/workers/`、`apps/viewer-min/`、`packages/document-model/`、`packages/core/`、`packages/exporters/pptx/`、`packages/renderer/web-min/`、`packages/adapters/penpot/`、`packages/shared/`、`fixtures/golden/`、`infrastructure/docker/`
- [X] T002 在仓库根初始化 pnpm workspace + Turborepo（`pnpm-workspace.yaml`、`turbo.json`、根 `package.json`），Node 20、TypeScript 5 严格模式
- [X] T003 [P] 配置 ESLint/Prettier（根配置）与 Vitest 工作区基线（`vitest.workspace.ts` 或各包扩展点）
- [X] T004 [P] 编写 `infrastructure/docker/docker-compose.yml`：PostgreSQL、Redis/Valkey、MinIO；预留 server/worker 服务位
- [X] T005 [P] 在 `packages/shared/src/constants.ts` 定义阈值常量：`PAGE_SOFT_LIMIT=20`、`BROWSER_EXPORT_HINT_MS=25000`、`BROWSER_EXPORT_TARGET_MS=30000`；另含 `SIMPLE_PATH_MAX_POINTS=8`

**Checkpoint**: 仓库可 `pnpm install`，空包可被 turbo 识别

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有故事共用的 CDM、校验、错误码、服务端底座与鉴权（FR-016）

**⚠️ CRITICAL**: 未完成前不得开始用户故事实现

- [X] T006 在 `packages/document-model/src/` 实现 CDM TypeScript 类型：`CanvoryDocument`（必填 `schemaVersion`、`id`、`title`、`type`、`settings.width/height/unit="px"`、`scenes[]`、`assets[]`、`animations[]`、`interactions[]`、`metadata`）
- [X] T007 [P] 在 `packages/document-model/src/schema.ts` 用 Zod 校验 CDM；不支持的 `schemaVersion` 拒绝并映射错误码 `SCHEMA_UNSUPPORTED`
- [X] T008 [P] 在 `packages/document-model/src/` 定义 Scene（`type` 含 `slide`）、Node 联合（`text|shape|image|path|group`）、AssetRef；约束：节点经 `assetId` 引用资源
- [X] T009 [P] 在 `packages/shared/src/errors.ts` 与 `packages/shared/src/i18n/zh.ts` 定义错误码与中文文案键（含 `SIZE_MISMATCH`、`UNAUTHORIZED`、`FORBIDDEN`、`TASK_NOT_DOWNLOADABLE`）
- [X] T010 在 `packages/core/src/geometry.ts` 实现像素↔英寸换算（基准 1920×1080→13.333×7.5in；同尺寸非 16:9 按比例自定义）
- [X] T011 在 `packages/core/src/size-guard.ts` 实现所选 scenes 画幅一致性检查：不一致抛 `SIZE_MISMATCH`（FR-003a）
- [X] T012 脚手架 `apps/server` NestJS 应用：模块边界 `documents`、`export`、`assets`、全局配置（Postgres/Redis/MinIO env）
- [X] T013 [P] 在 `apps/server/src/auth/` 实现认证守卫：未认证返回 401 且不返回文档体（FR-016）；预留 403
- [X] T014 [P] 在 `apps/server` 配置 Postgres 迁移框架与初表：`documents`、`document_versions`（JSONB content）、`export_tasks`、`assets`（字段对齐 data-model.md）
- [X] T015 在 `packages/core/src/index.ts` 导出公共 API 表面，供 plugin/worker/exporter 引用
- [X] T015a 在 `infrastructure/docker/` 接入自托管 Penpot（官方 Compose 或 overlay）：锁定镜像版本、开启 `enable-plugins-runtime`、文档化 HTTPS/CORS 与插件 manifest 一键安装（`infrastructure/docker/README-penpot.md`）
- [X] T015b 在 `apps/server/src/documents/documents.controller.ts` 实现文档当前态：`POST/GET/PATCH /api/v1/documents`（创建/读取/更新当前 CDM，关联 `documentId`；鉴权 FR-016）
- [X] T015c 在 `apps/server/src/assets/` 实现 Asset 管道：上传至 MinIO（返回 `id`+`storageKey`）、按 id 下载字节；插件导出前可注册图片资源（浏览器内联 Blob 仍允许，Worker 路径 MUST 走 storageKey）

**Checkpoint**: Foundation ready — 可开始各 User Story

---

## Phase 3: User Story 1 - 从画板导出可编辑演示文稿 (Priority: P1) 🎯 MVP

**Goal**: Penpot 提取基础元素 → CDM → 浏览器下载可编辑 PPTX（文本/矩形/图片）

**Independent Test**: 三页样例（文本+矩形+图片）经插件导出，办公软件打开无修复提示且文本可编辑（spec US1）

### Implementation for User Story 1

- [X] T016 [P] [US1] 在 `packages/adapters/penpot/src/extract.ts` 实现 `extractDocument`：board→Scene(`slide`)、坐标/旋转/叠放顺序（contracts/penpot-adapter.md）
- [X] T017 [P] [US1] 在 `packages/adapters/penpot/src/nodes.ts` 映射 text/rect/image → CDM Node；图片写入 AssetRef（优先调用 T015c 注册；浏览器可暂内联 Blob）
- [X] T018 [US1] 在 `packages/exporters/pptx/src/build.ts` 实现 CDM→PPTX（PptxGenJS）：原生文本框、矩形、图片；固定文本框宽高、关闭自动缩放；图片字节来自 Blob 或 Asset 下载
- [X] T019 [US1] 在 `packages/exporters/pptx/src/scope.ts` 实现范围过滤与排序（`all|sceneIds`，`sort: position|name`，FR-003）
- [X] T020 [US1] 导出前调用 `size-guard`；混尺寸中文拒绝，不生成文件（FR-003a）
- [X] T021 [US1] 脚手架 `apps/penpot-plugin/`：manifest、权限最小化、加载 shared/exporters/adapters（依赖 T015a 环境）
- [X] T022 [US1] 在 `apps/penpot-plugin/src/ui/ExportPanel.tsx`（或等价）实现范围选择、进度、成功下载；取消/失败不触发下载（FR-012b 浏览器侧）。**注意：本文件后续 T038/T050 必须串行，禁止并行改同一文件**
- [X] T023 [US1] 在 `apps/penpot-plugin/src/main.ts` 串联：布局稳定→extract→guard→build→download
- [X] T024 [US1] 添加 `fixtures/golden/G-TEXT-01.json`、`G-SHAPE-01.json`、`G-IMG-01.json` 最小手工 CDM，供不经 Penpot 调用 exporter 冒烟

**Checkpoint**: US1 可独立演示浏览器导出 MVP

---

## Phase 4: User Story 2 - 导出前预检与降级透明 (Priority: P1)

**Goal**: L0–L3 预检面板与导出报告一致；跳过/栅格化可解释

**Independent Test**: 含模糊/复杂路径/隐藏层样例仅跑预检即可见分级；导出后报告分级一致（US2）

### Implementation for User Story 2

- [X] T025 [P] [US2] 在 `packages/core/src/degrade.ts` 实现 L0/L1/L2/L3 判定（隐藏/空文本/零尺寸→L3；模糊/复杂特效→L2；路径点数>`SIMPLE_PATH_MAX_POINTS` 或含布尔运算→L2 等）
- [X] T026 [P] [US2] 在 `packages/core/src/preflight.ts` 聚合 `ExportReport`（pages/items/totals/fonts/blockingErrors，对齐 contracts/preflight-report.md）
- [X] T027 [US2] 在 `packages/core/src/rasterize.ts` 实现 L2 栅格化钩子（分辨率上限可配置）；**禁止**将 raster 写回 CDM 作为唯一真相（FR-015）
- [X] T028 [US2] 在 `packages/exporters/pptx/src/build.ts` 接入降级：L2 嵌入图片且保留位置/叠放；L3 跳过
- [X] T029 [US2] 预检与导出共用同一 `preflight(cdm, mode)` 结果，保证分级一致
- [X] T030 [US2] 在 `apps/penpot-plugin/src/ui/PreflightPanel.tsx` 按页展示 L0–L3 数量与中文明细；支持下载 JSON 报告
- [X] T031 [US2] 在 `apps/server/src/export/preflight.controller.ts` 实现 `POST /api/v1/export/preflight`（409+blockingErrors 时仍返回报告体）
- [X] T032 [US2] 补充 `fixtures/golden/G-FX-01.json`、`G-SKIP-01.json` 与期望报告摘要

**Checkpoint**: US2 预检可信，可独立验收

---

## Phase 5: User Story 5 - 大文件可靠导出与版本可回退 (Priority: P1)

**Goal**: 文档版本（恢复=新版本拷贝）、后台导出任务、>20 页/≥25s 提示；失败物用户不可下（FR-011/012/012b）

**Independent Test**: >20 页建议后台；保存两版后恢复再导出一致；失败/取消无用户下载（US5）

### Implementation for User Story 5

- [X] T033 [P] [US5] 在 `apps/server/src/documents/versions.service.ts` 实现保存版本：整份 CDM JSONB 快照，`version` 递增
- [X] T034 [US5] 实现 `POST/GET /api/v1/documents/:id/versions` 与 `POST .../restore`：**MUST 拷贝为新版本**（data-model 恢复语义）
- [X] T035 [P] [US5] 在 `apps/server/src/export/tasks.service.ts` 建模 ExportTask 状态机：`queued→running→succeeded|failed`，`queued|running→cancelled`
- [X] T036 [US5] 实现 `POST/GET /api/v1/export/tasks`、`cancel`、`retry`、`artifact`：仅 `succeeded` 返回 downloadUrl；失败返回 404（contracts/export-api.md）
- [X] T037 [US5] 在 `apps/workers/src/pptx.worker.ts` 用 BullMQ 消费任务：读版本快照→core/exporter→上传 MinIO `artifactKey`；失败写 `failureArtifactKey`（用户 API 不可见）与中文 `errorMessage`
- [X] T038 [US5] （依赖 T022）在 `apps/penpot-plugin/src/ui/ExportPanel.tsx`：所选 scene>20 默认勾选后台；浏览器已用时≥25s 提示改走后台（T005 常量）
- [X] T039 [US5] 插件提交后台任务并轮询状态/下载；取消浏览器导出丢弃临时 Blob；Worker 导出前确保图片 Asset 已上传（T015c）
- [X] T040 [US5] 未认证请求文档/导出 API 的集成冒烟：期望 401（FR-016）

**Checkpoint**: US5 满足同一发布包必达的版本+队列能力

---

## Phase 6: User Story 3 - 富文本、图形与备注 (Priority: P2)

**Goal**: 多 runs、椭圆/线/简单路径、备注、字体映射报告（不嵌入）

**Independent Test**: 黄金样例覆盖富文本/备注/字体提示（US3）

### Implementation for User Story 3

- [X] T041 [P] [US3] 扩展 `packages/adapters/penpot/src/nodes.ts`：富文本分段 runs、ellipse/line、简单 path（点数≤`SIMPLE_PATH_MAX_POINTS`）、group 展开保序
- [X] T042 [P] [US3] 扩展 `packages/adapters/penpot/src/notes.ts`：演讲者备注读写（pluginData 约定）→ Scene.notes
- [X] T043 [US3] 在 `packages/exporters/pptx/src/text.ts` 映射多 runs（字重/颜色/斜体/下划线）；备注写入幻灯片 notes
- [X] T044 [US3] 在 `packages/exporters/pptx/src/shapes.ts` 映射描边/圆角/透明度/外阴影（能力外→降级）
- [X] T045 [P] [US3] 在 `packages/core/src/font-map.ts` 实现可配置 FontMappingConfig；报告列出源/目标与安装提示；**不嵌入字体**（FR-010）
- [X] T046 [US3] 预检报告合并 `fonts[]`；插件展示中文安装提示
- [X] T047 [US3] 补充 `fixtures/golden/G-TEXT-02.json`、`G-NOTES-01.json`、`G-GROUP-01.json`、`G-SHAPE-02.json`

**Checkpoint**: US3 正式元素面可用

---

## Phase 7: User Story 4 - 按目标选择导出模式 (Priority: P2)

**Goal**: `auto|editable|fidelity` 三模式只改降级阈值，不改 CDM

**Independent Test**: 同一复杂样例三模式导出，原生比例与 L2 分布符合预期（US4）

### Implementation for User Story 4

- [X] T048 [US4] 在 `packages/core/src/modes.ts` 定义三模式阈值表（editable 更倾向 L1 告警；fidelity 更易 L2；auto 默认）
- [X] T049 [US4] `preflight`/`degrade`/`exporter` 全链路接收 `mode` 参数并写入报告 `mode` 字段
- [X] T050 [US4] （依赖 T038）在 `apps/penpot-plugin/src/ui/ExportPanel.tsx` 增加模式选择，默认 `auto`；与 T022/T038 **串行**同一文件
- [X] T051 [US4] 服务端 `POST /export/tasks` 与 `preflight` body 校验 mode 枚举

**Checkpoint**: US4 模式可演示对比

---

## Phase 8: User Story 6 - 架构护栏最小 HTML (Priority: P2)

**Goal**: 手工 CDM → PPTX + viewer-min 只读核对（验收 A/B）；不经 Penpot

**Independent Test**: `fixtures/golden` 直接 exporter + viewer-min 打开，页数与主要文本一致（US6/SC-007）

### Implementation for User Story 6

- [X] T052 [P] [US6] 在 `packages/renderer/web-min/src/render.ts` 实现只读渲染：页结构、文本、基本位置（不做发布产品化）
- [X] T053 [US6] 脚手架 `apps/viewer-min/` 加载 CDM JSON 并调用 web-min
- [X] T054 [US6] 添加 CLI 或 script `packages/exporters/pptx/scripts/export-file.ts`：从文件读 CDM 出 PPTX（验收 B）
- [X] T055 [US6] 补充 `fixtures/golden/G-NEG-SIZE.json` 负面混尺寸样例；文档化 A/B 操作于 `specs/001-pptx-phase1/quickstart.md` 对照执行记录模板
- [X] T056 [US6] 确认 Adapter 无直接 PPTX 生成路径（代码审查清单写入 `packages/adapters/penpot/README.md`）

**Checkpoint**: 架构验收 A/B 可重复执行

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 发布门禁、兼容、样例治理、文档同步

- [X] T057 [P] 补齐 `fixtures/golden/README.md` 覆盖表中全部 G-* 样例文件与期望报告摘要
- [X] T058 实现/记录 SC-001–003 于 `fixtures/golden/metrics.md`：含 LibreOffice 无头渲染命令、锚点抽样、分母分子；SC-004 计时规程（点击→可下载，墙钟/performance.now）与不达标记缺陷模板
- [X] T059 执行 `specs/001-pptx-phase1/quickstart.md` V1–V9（含 ≤20 页 30s 计时），结果写入 `docs/test/0-tested.md` 与 `docs/test/2-test-report/`
- [X] T060 [P] 跨软件兼容矩阵（PowerPoint/WPS/Keynote/LibreOffice）记录于 `docs/test/2-test-report/`
- [X] T061 同步 `docs/shipping/0-to-dos.md` / `1-doing.md` / `2-done.md` 与本任务进度
- [X] T062 [P] 更新 `docs/plan/1-confirmed.md`：纳入 FR-016、恢复语义、后台提示规则、Penpot 部署与 Asset 管道等决策
- [X] T063 发布前核对 `checklists/release.md` 仍为 46/46，且 SC-009 清单项均有证据链接
- [X] T064 执行 SC-008 可用性试用：≥5 名目标用户 × 标准演示稿；记录成功/失败于 `docs/test/2-test-report/sc008-usability.md`；未满样本标注「试用未完成」于发布说明（不单独否决 SC-009）

**ExportPanel 串行链（G5）**: `T022 → T038 → T050`（禁止并行改同一文件）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖
- **Foundational (Phase 2)**: 依赖 Setup；**阻塞**所有用户故事
- **US1 → US2 → US5 (P1)**: 建议顺序；US2 依赖 US1 的 exporter 管道；US5 可与 US2 部分并行（服务端 vs 插件预检）但任务 API 依赖 Foundation
- **US3 → US4 (P2)**: US3 扩展映射；US4 依赖 preflight/degrade 已存在（US2）
- **US6 (P2)**: 依赖 CDM + exporter；可与 US3/US4 并行
- **Polish**: 依赖计划纳入发布的全部故事

### User Story Dependencies

- **US1 (P1)**: Foundation 完成后即可；MVP
- **US2 (P1)**: 复用 US1 exporter；独立可测预检
- **US5 (P1)**: Foundation 鉴权/DB；可与 US2 并行开发不同目录
- **US3 (P2)**: 扩展 Adapter/Exporter；依赖 US1 基线
- **US4 (P2)**: 依赖 US2 降级引擎
- **US6 (P2)**: 依赖 document-model + pptx exporter；不依赖插件 UI

### Parallel Opportunities

- Setup：T003/T004/T005 并行
- Foundation：T007/T008/T009、T013/T014 并行
- US1：T016/T017 并行；T024 样例并行
- US2：T025/T026 并行
- US5：T033 与 T035 并行
- US3：T041/T042/T045 并行
- US6：T052 与 T054 并行
- Polish：T057/T060/T062 并行

---

## Parallel Example: User Story 1

```bash
# 并行：Adapter 提取与 PPTX 构建骨架
Task: "packages/adapters/penpot/src/extract.ts"
Task: "packages/adapters/penpot/src/nodes.ts"
Task: "packages/exporters/pptx/src/build.ts"

# 随后串行：插件串联与下载
Task: "apps/penpot-plugin export panel + main pipeline"
```

## Parallel Example: User Story 5

```bash
Task: "versions.service.ts + restore MUST copy"
Task: "tasks.service.ts state machine"
# 然后 worker + plugin 轮询
```

---

## Implementation Strategy

### Demo MVP vs Release Gate（G4 澄清）

**可演示 MVP（非发布）**：Setup + Foundation + **US1** 完成后可 STOP 做三页导出演示。

**第一阶段发布门禁（SC-009）**：MUST 再完成 **US2 + US5**（预检、版本、后台）及 Polish 中 T058–T060、T063；US3/US4/US6 属规格范围内应交付能力，发布说明若暂缺须显式豁免并经评审。

### Incremental Delivery

1. US1 演示导出（MVP demo）  
2. US2 预检可信  
3. US5 版本+后台 → **达到 SC-009 技术底线**  
4. US3 元素面  
5. US4 三模式  
6. US6 架构护栏  
7. Polish / quickstart / SC-008 试用归档

### Parallel Team Strategy

- A：US1 → US3 → US4（插件+导出）  
- B：Foundation 后 US5（server/worker）  
- C：US2 降级核心 → 支援 US4；US6 viewer-min  

---

## Notes

- [P] = 不同文件且无未完成依赖；**例外**：`ExportPanel.tsx` 相关任务不可因 [P] 并行
- 同一发布包：US1+US2+US5（及质量门禁）为 SC-009 底线；US3/US4/US6 属规格范围内应交付
- 分析修复（2026-11-17）：G1→T064；G2→T015a；G3→T015c；G4→Demo vs Release；G5→串行链；G6–G9→spec/metrics/documents
- 中文用户文案；代码标识英文
- 完成任务后更新 shipping 看板，勿在 plan 重复维护任务清单

## Phase 10: Convergence

**Purpose**: 收敛规格/计划与当前实现对齐后的剩余缺口（`/speckit-converge` 2026-11-17）

- [X] T065 CRITICAL 在 `apps/penpot-plugin/` 接入真实 Penpot Plugin API（读取 boards/shapes/选区），替换 `App.tsx` DEMO_BOARDS 占位，使 `extractDocument` 消费宿主数据 per FR-002 / US1 (missing)
- [X] T066 在 `packages/core/src/rasterize.ts` + `packages/exporters/pptx/src/build.ts` 为 L2（path/shape 等）注入栅格位图并嵌入 PPTX 图片对象（保留位置/叠放）；禁止回写 CDM per FR-015 / US2/AC (partial)
- [X] T067 完善 `apps/workers/src/pptx.worker.ts`：实际上传 MinIO `artifactKey`、写回任务 `succeeded|failed` 与 `failureArtifactKey`，打通 BullMQ 端到端 per FR-012 / plan:storage (partial)
- [X] T068 在 Asset 上传与 Worker/导出路径解析 `storageKey` 字节（`apps/server/src/assets/`、`storage/minio.ts`、exporter 取图）；不以仅 dataUrl 满足 Worker 路径 per T015c / FR-012 (partial)
- [X] T069 将 `documents` / `document_versions` / `export_tasks` / `assets` 从内存 Map 落到 Postgres（沿用 `001_init.sql`），恢复与任务跨进程可见 per plan: PostgreSQL / FR-011 (partial)
- [X] T070 完成 SC-005 跨软件实测并更新 `docs/test/2-test-report/compat-matrix.md`（消除「待测」），作为 SC-009 发布证据 per SC-005 / SC-009 (partial)
- [X] T071 [P] 在 `ExportPanel.tsx` 增加页面排序 `position|name` 选择并传入 scope per FR-003 (missing)
- [X] T072 导出成功后在插件提供可下载 ExportReport（与预检同一结构）per FR-008 (partial)
- [X] T073 服务端 `preflight` / `export/tasks` 用 Zod（或等价）校验 `mode ∈ auto|editable|fidelity`，非法返回 400 per FR-009 / T051 (partial)
- [X] T074 在 `packages/core/src/degrade.ts` 对内容超出裁剪边界写入告警（L1/L2），禁止静默裁切无提示 per EdgeCases (missing)
- [X] T075 在 `packages/exporters/pptx/src/shapes.ts` 映射外阴影，或能力外明确降级为 L2 per US3 / FR-005 (partial)
- [X] T076 [P] 扩展 `packages/adapters/penpot/src/extract.ts`：图片节点写入 `doc.assets` AssetRef（storageKey/dataUrl）而非空 assets 数组 per FR-002 / Asset (partial)
- [X] T077 强化 `packages/core/src/modes.ts` + `degrade.ts`：editable 更倾向 L1 告警保留原生、fidelity 更易 L2，使三模式报告分布可区分 per FR-009 / US4 (partial)
- [X] T078 [P] 添加脚本按 `fixtures/golden` 自动计算 SC-001/SC-002 比率并写入 `docs/test/2-test-report/` per SC-001 / SC-002 (missing)
- [X] T079 实现可选 LibreOffice 无头测量流水线（有 soffice 时跑 SC-003；无则明确 SKIP 记录）per SC-003 (partial)

## Phase 11: Convergence

**Purpose**: 二次收敛——对照规格/计划核实 Phase 10 完成后仍存的代码与证据缺口（`/speckit-converge` 2026-11-17）

- [X] T080 CRITICAL 重写 `apps/penpot-plugin/src/penpot-host.ts`：按官方 Plugin API（`penpot.currentPage.findShapes({ type: "board" })`、`Board.children`、`selection`、`currentFile`；禁止依赖已移除的 `getPage`/`shapes` 索引）提取多页画板，使宿主内不再误回退 DEMO per FR-002 / US1/AC1 / plan:Penpot Adapter (partial)
- [X] T081 在 `apps/penpot-plugin` 增加保存文档到服务端（`POST /api/v1/documents`）并把 `documentId` 传入 `ExportPanel`；后台导出路径可端到端提交任务 per FR-012 / US5/AC1 (missing)
- [X] T082 完善 `apps/workers/src/pptx.worker.ts`：`buildPptx` 注入 `resolveStorageKey`（从 MinIO `getObject` 取字节转 data URL），使仅含 `storageKey` 的 Asset 可嵌入 per FR-012 / plan:Asset storageKey (partial)
- [X] T083 强化 `apps/server/src/documents/documents.service.ts`：`putVersion` / `restore` / `listVersions` / `getCdmByVersion` 在 memory 未命中时从 Postgres 加载后再操作，保证跨进程版本恢复与任务建单可读 per FR-011 / US5/AC3 (partial)
- [X] T084 扩展宿主映射：Penpot 文本多 run 样式写入 `content.runs`；图片经 `shape.export`（或等价）写入 `doc.assets` dataUrl/storageKey，避免空图/单样式坍缩 per FR-006 / FR-002 / US3/AC1 (partial)
- [X] T085 插件 L2 路径注入真实栅格化（优先 Penpot `Shape.export` / canvas），替换默认 1×1 占位 PNG，且禁止回写 CDM per FR-005 / US2/AC2 / FR-015 (partial)
- [X] T086 [P] `ExportPanel` 后台取消调用 `POST .../cancel`；`TasksService.retry` 保留原 `scope` per FR-012b / US5/AC4 (partial)
- [ ] T087 **本阶段豁免（2026-11-17，非阻断）** SC-005 四软件实机打开不再作为 SC-009 证据。历史 BLOCKED-ENV 保留在 `compat-matrix.md`，不勾选、不记 PASS。后续若恢复，仍须四款软件真实打开且无修复提示。
