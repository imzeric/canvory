# 跨软件兼容矩阵（T060 / T070 / T087）

**更新日期**: 2026-11-17  
**环境**:
- 本机已装：`wpsoffice.app`（WPS）
- 未装：PowerPoint、Keynote、LibreOffice / soffice

| 样例 | PowerPoint | WPS | Keynote | LibreOffice | 结构冒烟 (OOXML zip) |
|------|------------|-----|---------|-------------|----------------------|
| G-TEXT-01 | BLOCKED-ENV | 待人工确认* | BLOCKED-ENV | BLOCKED-ENV | PASS（`pnpm validate:pptx-smoke`） |
| G-SHAPE-01 | BLOCKED-ENV | 待人工确认* | BLOCKED-ENV | BLOCKED-ENV | PASS |
| G-IMG-01 | BLOCKED-ENV | 待人工确认* | BLOCKED-ENV | BLOCKED-ENV | PASS |
| G-NOTES-01 | BLOCKED-ENV | 待人工确认* | BLOCKED-ENV | BLOCKED-ENV | PASS |

\* 2026-11-17 已用 `open -a wpsoffice` 拉起 `compat-artifacts/G-TEXT-01.pptx`；**「无修复提示」须人工目视确认**，自动化无法判定修复对话框。确认后将对应格改为 `PASS`。

## 结构冒烟（替代证据，非 SC-005 替代）

运行：`pnpm exec tsx scripts/pptx-structure-smoke.mts`  
验证 PPTX 为合法 ZIP 且含 `[Content_Types].xml` / `ppt/presentation.xml`。

## SC-005 / SC-009

- **SC-005**：未达标（四软件未齐；WPS 待人工确认）  
- **SC-009**：跨软件项仍为发布阻塞；证据索引见 `sc009-evidence.md`
