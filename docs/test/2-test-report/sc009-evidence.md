# SC-009 发布门禁证据索引

**日期**: 2026-11-17  
**结论**: 发布门禁仍不成立。版本恢复与 BullMQ/MinIO 已有本次远程实机记录；跨软件与 Penpot 三页下载未完成。SC-008 试用未完成。SC-003 为 SKIP，不能当成兼容通过。

| SC-009 要求 | 证据 | 状态 |
|-------------|------|------|
| 完整元素映射 | `packages/adapters/penpot`、`packages/exporters/pptx`；fixtures G-TEXT/SHAPE/IMG/GROUP/NOTES | 实现 ✓ |
| 预检报告 | `packages/core` preflight；`PreflightPanel`；V3 自动验收 | 实现 ✓ |
| 跨软件兼容 | `compat-matrix.md` + `pptx-structure-smoke.md` | ZIP 冒烟 ✓；本次远程四款软件均为 BLOCKED-ENV。不是 SC-005 |
| 文档版本恢复 | `rm03-infra.md`（新进程读到 v1/v2/v3） | 实机 ✓ |
| 后台导出任务 | `rm03-infra.md`（BullMQ 成功可下、取消 404、MinIO 对象） | 实机 ✓ |

## 相关成功标准交叉引用

| ID | 证据 |
|----|------|
| SC-001/002 | `fixtures/golden/metrics.md` + `pnpm validate:quickstart` |
| SC-003 | metrics.md LibreOffice 命令（待本机 soffice） |
| SC-004 | V9 自动验收；常量 `BROWSER_EXPORT_TARGET_MS` |
| SC-005 | compat-matrix.md |
| SC-006 | V3 预检/导出 totals 一致 |
| SC-007 | V8 A/B；产物 `quickstart-artifacts/` |
| SC-008 | `sc008-usability.md`（试用未完成） |
| FR-016 | `auth.smoke.test.ts` |

## release checklist

`specs/001-pptx-phase1/checklists/release.md`：**46/46**（需求质量评审；非实现完成证明）
