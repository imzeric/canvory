# Tested — 已测通过

> 状态：通过项台账  
> 更新日期：2026-11-17

## 使用说明

- 记录已执行且**通过**的验证项。  
- 详细报告放入 `2-test-report/`，本表只保留索引。  
- 失败项不要写在这里，写入 `1-defect.md`。

## 通过清单

| 用例 ID | 名称 | 阶段 | 执行日期 | 结果 | 报告 |
|---------|------|------|----------|------|------|
| UT-CDM-01 | schema Zod + SCHEMA_UNSUPPORTED | S0 | 2026-11-17 | 通过 | vitest `@canvory/document-model` |
| UT-CORE-01 | size-guard SIZE_MISMATCH | S0 | 2026-11-17 | 通过 | vitest `@canvory/core` |
| UT-AUTH-01 | FR-016 Bearer 守卫 | S0 | 2026-11-17 | 通过 | vitest auth.smoke |
| IT-V6 | 导出任务成功可下 / 取消不可下 | S0 | 2026-11-17 | 通过 | tasks.integration.test |
| IT-V7 | restore 拷贝为新版本 | S0 | 2026-11-17 | 通过 | versions.integration.test |
| QS-V2 | 混尺寸拒绝 | S0 | 2026-11-17 | 通过 | [quickstart-v1-v9.md](./2-test-report/quickstart-v1-v9.md) |
| QS-V3 | 预检与降级一致 | S0 | 2026-11-17 | 通过 | 同上 |
| QS-V4 | 富文本与备注 | S0 | 2026-11-17 | 通过 | 同上 |
| QS-V5 | 三模式 | S0 | 2026-11-17 | 通过 | 同上 |
| QS-V8 | 架构验收 A/B | S0 | 2026-11-17 | 通过 | 同上 + artifacts |
| QS-V9 | SC-004 单页耗时 | S0 | 2026-11-17 | 通过 | 同上 |
| RM-03 | Postgres/Redis/MinIO 非内存联调 | S1 | 2026-11-17 | 通过 | [rm03-infra.md](./2-test-report/rm03-infra.md) |
| RM-01 | Penpot 宿主三页前台下载 | S1 | 2026-11-17 | 通过 | [remote-acceptance-7484.md](./2-test-report/remote-acceptance-7484.md) |

## SKIP / 待实机

| 用例 ID | 说明 |
|---------|------|
| QS-V1 | quickstart 脚本不打开浏览器，仍 SKIP。浏览器实机见 RM-01 |
| SC-003 | 位置误差 SKIP（本次未安装 LibreOffice） |
| SC-005 | 豁免且未验证：本次远程四款 BLOCKED-ENV |
| SC-008 | 豁免且未开展：无真实参与者 |

## 计划中的核心用例

| 用例 ID | 名称 | 类型 | 通过标准 |
|---------|------|------|----------|
| QA-PPTX-01 | 文本可编辑率 | 质量 | ≥95% 原生文本框 |
| QA-PPTX-02 | 坐标误差 | 质量 | ≤0.5% 页宽（需 soffice） |
| QA-PPTX-04 | 跨软件打开 | 兼容 | 见 compat-matrix |
