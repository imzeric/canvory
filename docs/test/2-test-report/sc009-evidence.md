# SC-009 发布门禁证据索引

**日期**: 2026-11-17  
**结论**: 技术骨架已齐；跨软件实测与 Penpot UI 实机仍为发布前必补项。

| SC-009 要求 | 证据 | 状态 |
|-------------|------|------|
| 完整元素映射 | `packages/adapters/penpot`、`packages/exporters/pptx`；fixtures G-TEXT/SHAPE/IMG/GROUP/NOTES | 实现 ✓ |
| 预检报告 | `packages/core` preflight；`PreflightPanel`；V3 自动验收 | 实现 ✓ |
| 跨软件兼容 | `compat-matrix.md` + `pptx-structure-smoke.md` | 结构冒烟 ✓；WPS 已拉起待人工确认；PP/Keynote/LibreOffice BLOCKED-ENV |
| 文档版本恢复 | `versions.integration.test.ts`；export-api restore MUST 拷贝 | 实现 ✓ |
| 后台导出任务 | `TasksService` + `queue.ts`（BullMQ 可选）+ 内联回退；tasks.integration.test | 实现 ✓ |

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
