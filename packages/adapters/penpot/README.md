# @canvory/adapter-penpot

Penpot → CDM 提取层。

## 禁止

- **禁止**在本包内直接生成 PPTX（须经 `@canvory/exporter-pptx`）
- **禁止**把 Penpot 私有结构泄漏为 Exporter 必依赖字段

## 审查清单（SC / T056）

- [x] 无 `pptxgenjs` 依赖（见 `package.json`）
- [x] 输出仅 `CanvoryDocument`（`extractDocument`）
- [x] 图片经 AssetRef（storageKey / dataUrl）；无直接 PPTX 生成路径
