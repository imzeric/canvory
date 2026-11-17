# Confirmed — 已确认决策

> 状态：已确认  
> 更新日期：2026-11-17  
> 来源：技术架构 v1.0、Penpot-PPTX Web 方案 v0.2、Canvory Constitution v1.0.0

## 产品与架构

| 决策 | 结论 |
|------|------|
| 产品定位 | 统一视觉内容生产平台，非单一 PPT 工具 |
| 核心资产 | Canvory Document Model（CDM），带 `schemaVersion` |
| 分层 | 内容层 / 表现层 / 运行层分离 |
| 输出策略 | PPTX 为首个出口；HTML 为正式交付形态 |
| 编辑器策略 | 短期 Penpot Adapter；长期自研 Studio |
| 底座选型 | 不 fork Penpot 前端；映射核心与运行环境解耦 |
| 导出路线 | 插件直出 PPTX（不经 HTML 中转）；HTML 为独立 Renderer |
| 工程形态 | TypeScript 模块化单体 + Monorepo；暂不微服务 |
| 文档语言 | 规格、计划、评审、Agent 输出使用简体中文 |

## 关键约束（来自宪法）

1. 禁止以 PPTX / Penpot / Slidev / Markdown 作为唯一底层数据结构。  
2. 动画持久化为标准化描述，禁止直接存运行时对象。  
3. 复杂对象不得为适配某一格式而栅格化后回写 CDM。  
4. AI 只能产出可校验的 CDM 变更，禁止以 DOM 为持久化路径。  
5. 发布侧限制不可信脚本与嵌入。

## 第一阶段质量门槛

| 指标 | 目标 |
|------|------|
| PPTX 原生可编辑文本 | ≥95% |
| 基础图形原生可编辑 | ≥90% |
| 页面尺寸与坐标误差 | ≤0.5% 页宽 |
| 20 页导出耗时 | ≤30 秒 |
| 兼容性 | PowerPoint、WPS、Keynote、LibreOffice 无修复提示 |
| 复杂元素 | 必须有明确降级报告 |

## 阶段边界（已确认顺序）

`S0 PoC → S1 PPTX 正式版 → S2 HTML 双出口 → S3 Studio → S4 动画互动 → S5 形态扩展`

顺序不可跳过「CDM + 双出口能力」去堆编辑器功能。

## 规格澄清纳入（001-pptx-phase1）

| 决策 | 结论 |
|------|------|
| FR-016 鉴权 | 文档/版本/导出 API 必须认证；未认证 401 且不回文档体 |
| 版本恢复 | restore = 将目标快照**拷贝为新版本**，禁止只移动指针 |
| 后台提示 | 所选页 >20 默认建议后台；浏览器 ≥25s 提示改后台 |
| Penpot 部署 | 官方 Compose overlay；开启 plugins runtime；不 fork 前端 |
| Asset 管道 | Worker 路径必须 `storageKey`；浏览器允许暂内联 Blob/dataUrl |
| 导出模式 | `auto\|editable\|fidelity` 只改降级策略，不改 CDM |

## 实机验收确认清单（001 代码已齐，发布前 MUST）

> **已确认**：下列三项为第一阶段发布前必做实机门禁；代码/自动验收不可替代。  
> **执行台账**：`docs/shipping/0-to-dos.md`（ID 对齐）  
> **证据目录**：`docs/test/0-tested.md`、`docs/test/2-test-report/`

| ID | 项 | 验收标准 | 证据落点 | 阻塞 |
|----|----|----------|----------|------|
| RM-01 | Penpot 装插件跑 V1 | 自托管可登录；plugins runtime 开；安装 Canvory 插件；三页（文本+矩形+图片）浏览器导出可打开 PPTX | `quickstart` V1 记录；更新 `0-tested.md` | SC-009 演示闭环 / RTG-03 |
| RM-02 | 办公软件填 SC-005 | 黄金样例产物在 PowerPoint、WPS、Keynote、LibreOffice **均无修复提示**；矩阵「待测/BLOCKED」清零 | `compat-matrix.md` 勾选通过 | SC-005 / SC-009 |
| RM-03 | Postgres / Redis / MinIO 联调 | `USE_MEMORY_DB≠1`；`DATABASE_URL`+`REDIS_URL`+`MINIO_*`；文档版本跨进程可读；BullMQ 任务 succeeded 可下产物；Asset `storageKey` 可取字节 | 联调记录入 `2-test-report/`；可选写 `.env` 清单（勿提交密钥） | FR-011 / FR-012 / BK-06 |

### 操作指引（确认路径，不替代执行）

1. **RM-01**  
   `cd infrastructure/docker && docker compose -f docker-compose.yml -f docker-compose.penpot.yml up -d`  
   → 按 `README-penpot.md` 安装插件 → 跑 quickstart **V1**。
2. **RM-02**  
   `pnpm validate:quickstart` / `validate:pptx-smoke` 生成产物 → 四软件打开 → 更新 `compat-matrix.md`。
3. **RM-03**  
   拉起 compose 基建 → 配置 `.env`（参考 `.env.example`，`EXPORT_INLINE=0`）→ 起 server + worker → 创建文档/提交导出任务/下载 artifact。

### 明确不计入本清单（已另有状态）

| 项 | 状态说明 |
|----|----------|
| SC-008 可用性试用 ≥5 人 | 未满样本标「试用未完成」；**不单独否决** SC-009，但发布说明 MUST 标注 |
| SC-003 LibreOffice 锚点误差 | 有 soffice 后跑 `pnpm validate:sc003`；无则保持 SKIP 记录 |

## 第一阶段未达标 / 未完成（已确认跟踪）

> **结论（2026-11-17）**：001 **实现与自动验收基本齐**；按 SC-009 / 本文件实机清单，**第一阶段发布包尚未全部完成**。  
> **台账**：开放项维护在 `docs/shipping/0-to-dos.md`（及 `1-doing.md`）；证据在 `docs/test/`。  
> **规格任务**：`specs/001-pptx-phase1/tasks.md` 仅余 **T087**（= RM-02 证据）未勾。

### A. 发布阻塞（SC-009 必达 · 未完成）

| ID | 项 | 当前状态 | 缺口 | 证据 / 台账 |
|----|----|----------|------|-------------|
| RM-01 | Penpot 装插件跑 V1 | **未完成** | 自托管 Penpot + plugins runtime + 插件安装 + 三页浏览器导出可开 PPTX 未实机验收；quickstart **V1 = SKIP** | `0-to-dos` RM-01；`1-doing` RTG-03；`quickstart-v1-v9.md` |
| RM-02 | 办公软件填 SC-005 | **未达标** | PP / Keynote / LibreOffice = `BLOCKED-ENV`；WPS 已拉起产物，**「无修复提示」待人工目视**；矩阵未清零；**T087** 未勾 | `compat-matrix.md`；`0-to-dos` RM-02；tasks T087 |
| RM-03 | Postgres / Redis / MinIO 联调 | **未完成** | 代码路径已有；缺 `USE_MEMORY_DB≠1` 实机联调记录（跨进程版本、BullMQ succeeded 下载、`storageKey` 取字节） | `0-to-dos` RM-03；尚无 `2-test-report` 联调报告 |

**SC-009 交叉状态**

| 要求 | 状态 |
|------|------|
| 完整元素映射 + 预检报告 | 实现 ✓（自动验收 / fixtures） |
| 跨软件兼容达标（SC-005） | **未达标** ← RM-02 |
| 文档版本恢复 | 实现 ✓（集成测）；**跨进程实机** ← 依赖 RM-03 |
| 后台导出任务 | 实现 ✓（集成测 / 内联）；**BullMQ+MinIO 实机** ← 依赖 RM-03 |
| 演示闭环（Penpot UI） | **未完成** ← RM-01 |

任一发布阻塞项未闭环 → **第一阶段不算发布完成**（与 `0-draft` MVP-3/MVP-4 同包约定一致）。

### B. 质量门槛对照（未达标或 SKIP）

| 门槛 / SC | 目标 | 当前 | 判定 |
|-----------|------|------|------|
| SC-001 文本可编辑率 | ≥95% | 黄金样例自动比率 PASS（见 `sc001-sc002-rates.md`） | 达标（样例集） |
| SC-002 基础图形原生率 | ≥90% | 同上 PASS | 达标（样例集） |
| SC-003 位置误差 ≤0.5% 页宽 | LibreOffice 无头测锚点 | **SKIP**（无 soffice） | 未测 |
| SC-004 ≤20 页 / 30s | 墙钟可测 | 单页 CLI PASS；大页数实机未记 | 部分 |
| SC-005 四软件无修复提示 | 100% | 矩阵未清零 | **未达标** |
| SC-006 L2/L3 全入报告 | 100% | V3 自动 PASS | 达标（自动） |
| SC-007 手工 CDM + 最小 HTML | 架构护栏 | V8 PASS | 达标 |
| SC-008 可用性 ≥5 人 / ≥90% | 试用协议 | **试用未完成**（样本不足） | 未完成；不单独否决 SC-009，发布说明 MUST 标注 |
| SC-009 发布总门禁 | 映射+预检+兼容+版本+后台 | 兼容与实机联调未齐 | **未成立** |

### C. 旁路未完成（确认跟踪，非本清单「三 RM」等价）

| ID | 项 | 阶段 | 说明 |
|----|----|------|------|
| SC-008 | 可用性试用满 5 人 | S1 | `0-to-dos` P1；`sc008-usability.md` |
| SC-003 | soffice 锚点测量 | S1 | `pnpm validate:sc003`；无环境保持 SKIP |
| BK-05 | HTML 发布与分享链接 | **S2** | 明确**不属于**第一阶段；仅登记避免误收口 |

### D. shipping 看板同步约定（已确认）

| 列 | 应对未完成项 |
|----|----------------|
| `0-to-dos.md` | RM-01 / RM-02 / RM-03 / SC-008 保持待办直至证据齐全 |
| `1-doing.md` | RTG-03（Penpot 实机）与 RM-01 同义；开始做时迁入并更新进展 |
| `2-done.md` | 仅在有 `docs/test` 证据后迁入；**禁止**仅因代码合并即勾 RM / SC-005 |

完成 RM-0x 后：更新本表「当前状态」→ 迁 shipping → 补 `0-tested.md` / `2-test-report/` →（RM-02）勾选 tasks **T087**。

## 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-11-17 | 初版入库 | 从设计方案与宪法提炼 |
| 2026-11-17 | 纳入 001 澄清 | FR-016、restore、后台提示、Penpot、Asset、mode |
| 2026-11-17 | 实机验收确认清单 | RM-01 Penpot V1；RM-02 SC-005；RM-03 PG/Redis/MinIO |
| 2026-11-17 | 未达标/未完成跟踪 | 补充 SC-009 阻塞、质量门槛对照、旁路项、shipping 同步约定 |
