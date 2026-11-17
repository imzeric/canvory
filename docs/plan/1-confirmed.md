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

## 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-11-17 | 初版入库 | 从设计方案与宪法提炼 |
| 2026-11-17 | 纳入 001 澄清 | FR-016、restore、后台提示、Penpot、Asset、mode |
| 2026-11-17 | 实机验收确认清单 | RM-01 Penpot V1；RM-02 SC-005；RM-03 PG/Redis/MinIO |
