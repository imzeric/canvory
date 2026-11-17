# 跨软件兼容矩阵（T060 / T070 / T087）

**更新日期**: 2026-11-17  
**本次执行环境**: 远程 Linux（云端），不是先前的 macOS 本机。

## 本次远程结果

检查命令：`command -v soffice`、`command -v libreoffice`、`command -v wps`、`command -v wpsoffice`、`command -v keynote`，以及 `dpkg -l` 中的办公套件包名。均无命中。

未安装 LibreOffice。SC-003 位置误差按要求跳过，这次跳过不能当成任何一款软件的打开结果。

| 样例 | PowerPoint | WPS | Keynote | LibreOffice | OOXML ZIP 冒烟 |
|------|------------|-----|---------|-------------|----------------|
| G-TEXT-01 | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | PASS（仅 ZIP 结构，不是 SC-005） |
| G-SHAPE-01 | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | PASS（同上） |
| G-IMG-01 | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | PASS（同上） |
| G-NOTES-01 | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | BLOCKED-ENV | PASS（同上） |

- PowerPoint：此环境无桌面版，也无授权。
- WPS：此环境无 `wps` / `wpsoffice`。
- Keynote：仅 macOS，此环境无法运行。
- LibreOffice：未安装。不为 SC-003 安装它，因此也无法用它做「无修复提示」目视。
- ZIP 冒烟（`pnpm validate:pptx-smoke`，退出码 0）只证明包结构，不能代替四款软件打开。

## 历史记录（非本次证据）

此前 macOS 记录曾写「已用 `open -a wpsoffice` 拉起 G-TEXT-01」，且「无修复提示」仍待人工目视。那次拉起发生在另一台机器，不能记为本环境的 PASS，T087 保持未勾。

## SC-005 / SC-009

- **SC-005**：2026-11-17 用户豁免，不再阻断本阶段发布。本次远程四款仍是 `BLOCKED-ENV`，不是 PASS。
- **SC-003**：SKIP（无 soffice）。测量仍要求 LibreOffice 无头把 PPTX 转成 PDF/PNG 再比中心点，阈值仍是页宽 0.5%。豁免 SC-005 不改变这一条。
- **T087**：不勾选。。
