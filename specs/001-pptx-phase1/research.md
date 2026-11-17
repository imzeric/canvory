# Research: 001-pptx-phase1

**Date**: 2026-11-17  
**依据**: 规格澄清、宪法、`docs/设计方案/Canvory_Technical_Architecture_v1.0.md`、`docs/设计方案/penpot-pptx-web-plan.md`

## 1. 中间表示：CDM 而非 Penpot/PPTX 私有结构

- **Decision**: 以 Canvory Document Model（CDM）为唯一导出输入；原「IR」升级为 CDM，带 `schemaVersion`。
- **Rationale**: 宪法 I/IV；可替换创作源；架构验收 B 要求手工 CDM 可导出。
- **Alternatives considered**: 插件内直接 Penpot→PPTX（否决：绑定工具）；以 PPTX OOXML 为真相（否决：反向限制产品）。

## 2. PPTX 生成库

- **Decision**: 第一阶段使用 PptxGenJS，在浏览器插件与 Node Worker 共用同一 `packages/exporters/pptx`。
- **Rationale**: 架构与 Penpot 方案已选定；支持文本/形状/图片等原生对象；纯 TS 可双端运行。
- **Alternatives considered**: 直接写 OOXML（成本高，作远期兜底）；HTML 中转再转 PPTX（否决：双次失真）。

## 3. 创作源与部署

- **Decision**: 自托管 Penpot + 插件（manifest URL）；不 fork 前端；提取经 `adapters/penpot`。
- **Rationale**: 快速验证画布→导出；宪法要求 Adapter 边界。
- **Alternatives considered**: 首期自研 Studio（否决：拖慢 PPT 闭环）；无头浏览器跑插件作唯一服务端路径（可作批量兜底，主路径仍为数据→CDM→core）。

## 4. 降级与预检

- **Decision**: L0 原生 / L1 近似 / L2 栅格化 / L3 跳过；预检与导出口径一致；报告可下载；中文文案。
- **Rationale**: 规格 FR-008、SC-006；Penpot 方案第 8 节。
- **Alternatives considered**: 仅导出后报告（否决：用户无法事前决策）；静默栅格化（否决）。

## 5. 导出模式

- **Decision**: `editable`（可编辑优先）、`fidelity`（高保真）、`auto`（默认自动优化）；模式只改变降级阈值，不改变 CDM。
- **Rationale**: 规格 FR-009；视觉与可编辑权衡产品化。
- **Alternatives considered**: 单一固定策略（否决：无法覆盖交付场景）。

## 6. 字体

- **Decision**: 可配置映射表 + 报告提示安装；不嵌入字体；不因缺字体默认栅格化文本。
- **Rationale**: Clarify Session 结论；PowerPoint 嵌入复杂且兼容成本高。
- **Alternatives considered**: 字体嵌入（延后）；缺字体即栅格化（否决：损害可编辑率）。

## 7. 画板尺寸

- **Decision**: 导出范围内尺寸必须一致，否则拒绝并中文说明；一致时允许非 16:9 自定义幻灯片尺寸。
- **Rationale**: Clarify；同一 PPTX 文件内尺寸一致性。
- **Alternatives considered**: 按首页缩放（否决：静默失真）；每页不同尺寸（否决：办公软件兼容差）。

## 8. 浏览器 vs 后台导出

- **Decision**: ≤20 页目标浏览器 ≤30s；所选 >20 页默认建议后台；浏览器**已用时 ≥25s 仍未完成**则提示改走（取消不可观测「预估」）；用户可坚持浏览器。失败：浏览器丢弃不完整文件；后台失败产物仅运维、用户不可下。
- **Rationale**: Clarify + 发布门禁补丁（CHK009/046）+ SC-004/FR-012b。
- **Alternatives considered**: 模糊预估超时（否决：不可验收）；强制后台（否决：小文档体验差）；允许用户下载不完整文件（否决：误用风险）。

## 9. 持久化与队列

- **Decision**: PostgreSQL 存文档 JSONB + 版本索引 + 任务元数据；MinIO/S3 存资源与成功 PPTX；BullMQ 驱动 Worker。版本恢复 MUST 拷贝为新版本。
- **Rationale**: 宪法工程约束；架构第八章；版本与后台为同一发布包必达；CHK044。
- **Alternatives considered**: 仅移动当前指针（否决：丢历史）；仅浏览器无服务端（否决：无法满足版本/后台）；微服务拆分（否决：过早）。

## 9b. API 鉴权

- **Decision**: 文档/版本/导出 API MUST 认证；未认证 401（FR-016）。
- **Rationale**: 发布门禁 CHK045；内网仍不可匿名读文档。
- **Alternatives considered**: 完全开放内网 API（否决：误用与泄露风险）。

## 10. 最小 HTML 护栏

- **Decision**: `viewer-min` + `renderer/web-min` 只读 CDM；用于验收 A/B，不做分享/发布产品化。
- **Rationale**: 宪法 III/VI；规格 FR-013。
- **Alternatives considered**: 第一阶段完整 HTML Publisher（否决：范围膨胀，属 Phase 2）。

## 11. 测试策略

- **Decision**: Vitest 覆盖提取/降级/映射；`fixtures/golden` 快照；兼容矩阵（PP/WPS/Keynote/LibreOffice）发布前门禁；架构 A/B 写入 quickstart。
- **Rationale**: SC-001–007、009。
- **Alternatives considered**: 仅手工点验（否决：不可回归）。

## 12. 坐标与单位

- **Decision**: CDM 存像素级逻辑坐标；导出时按统一画幅换算为英寸（基准参考：1920×1080 → 13.333×7.5 in，非 16:9 按比例自定义）。
- **Rationale**: Penpot 方案 6.2；误差门槛 ≤0.5% 页宽。
- **Alternatives considered**: CDM 直接存英寸（否决：编辑器像素更自然）。
