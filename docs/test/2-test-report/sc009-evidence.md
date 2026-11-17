# SC-009 发布门禁证据索引

**日期**: 2026-11-17  
**结论**: SC-009 只按更新后的必需项判定：映射与预检、Penpot 宿主前台导出并下载、文档版本恢复、后台导出任务。这四项都有证据，先前空内容下载只作历史。SC-005 与 SC-008 是用户豁免，不是测试通过。SC-003 继续 SKIP，不记通过。不能据此声称位置精度或四款办公软件已经验证。

| SC-009 要求 | 证据 | 状态 |
|-------------|------|------|
| 完整元素映射 | `packages/adapters/penpot`、`packages/exporters/pptx`；fixtures G-TEXT/SHAPE/IMG/GROUP/NOTES | 实现 ✓ |
| 预检报告 | `packages/core` preflight；`PreflightPanel`；V3 自动验收 | 实现 ✓ |
| 跨软件兼容（SC-005） | `compat-matrix.md` | **豁免**。历史 BLOCKED-ENV 保留，不是 PASS |
| 文档版本恢复 | `rm03-infra.md`（新进程读到 v1/v2/v3） | 实机 ✓ |
| 后台导出任务 | `rm03-infra.md`（BullMQ 成功可下、取消 404、MinIO 对象） | 实机 ✓ |
| Penpot 宿主前台导出下载 | `remote-acceptance-7484.md` 内容闭环：宿主 Penpot，三块 1920×1080 画板的子图层经 findShapes 核对；下载的 3 页含 `IT7484-PENPOT-TEXT`、填充 `3366CC` 的形状、`ppt/media/image-3-1.png` 且被 slide3 rel 引用。更早一次空内容下载不算通过 | 实机 ✓ |

## 相关成功标准交叉引用

| ID | 证据 |
|----|------|
| SC-001/002 | `fixtures/golden/metrics.md` + `pnpm validate:quickstart` |
| SC-003 | `scripts/sc003-measure.mts`：只在 PATH 上找到 `soffice` 或 `libreoffice` 时，用 `soffice --headless --convert-to pdf`。中心点对比写在 `fixtures/golden/metrics.md`（再经 `pdftoppm`）。阈值仍是页宽 0.5%。本次 SKIP |
| SC-004 | V9 自动验收；常量 `BROWSER_EXPORT_TARGET_MS` |
| SC-005 | 豁免。`compat-matrix.md` 仍是 BLOCKED-ENV |
| SC-006 | V3 预检/导出 totals 一致 |
| SC-007 | V8 A/B；产物 `quickstart-artifacts/` |
| SC-008 | 豁免。`sc008-usability.md` 样本为 0，不记通过 |
| FR-016 | `auth.smoke.test.ts` |

## release checklist

`specs/001-pptx-phase1/checklists/release.md`：**46/46**（需求质量评审；非实现完成证明）
