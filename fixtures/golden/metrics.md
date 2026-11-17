# 黄金样例度量规程（SC-001–004）

## SC-001 可编辑文本率

- 分母：样例合集中 `type=text` 且预检非 L3 的节点数
- 分子：其中导出报告为 L0 或 L1 的节点数
- 默认模式：`auto`
- 命令：`pnpm --filter @canvory/exporter-pptx export-file fixtures/golden/<id>.json /tmp/<id>.pptx`

## SC-002 图形原生率

- 分母：`type=shape|path` 且非 L3
- 分子：报告 L0/L1

## SC-003 位置误差

LibreOffice 无头渲染示例：

```bash
soffice --headless --convert-to pdf --outdir /tmp /tmp/G-TEXT-01.pptx
pdftoppm -png /tmp/G-TEXT-01.pdf /tmp/G-TEXT-01
# 人工或脚本抽样中心点，与 CDM transform 中心对比
```

## SC-004 导出耗时

- 计时：点击导出 → 可下载（`performance.now()` 或墙钟）
- ≤20 页目标 ≤30s（`BROWSER_EXPORT_TARGET_MS`）
- 不达标：在 `docs/test/1-defect.md` 登记缺陷，模板字段：样例 ID、页数、实测 ms、环境
