# Contract: Penpot Adapter

**Package**: `packages/adapters/penpot`  
**Input**: Penpot 插件可读的页面/形状树（布局已稳定）  
**Output**: `CanvoryDocument`（CDM）

## 函数级契约（逻辑）

```text
extractDocument(input: PenpotExtractInput): Promise<CanvoryDocument>
```

### PenpotExtractInput

| 字段 | 说明 |
|------|------|
| boards | 选中或全部画板 |
| sort | `position` \| `name` |
| includeNotes | 是否读取备注（pluginData 或约定字段） |

## 映射责任

| Penpot | CDM |
|--------|-----|
| board | Scene type=slide |
| text | Node type=text + runs |
| rect/circle/line | shape |
| image | image + Asset |
| group/frame | 展开为子节点（保留顺序） |
| 复杂 path/特效 | 仍输出结构化 Node；降级由 core 判定，Adapter 不生成 raster 真相 |

## 禁止

- 在 Adapter 内直接生成 PPTX
- 把 Penpot 特有 ID 结构泄漏为 Exporter 必依赖字段（可保留在 metadata 扩展袋，Exporter 忽略）

## 插件 UI → 核心

1. 收集 scope/mode  
2. `extractDocument` → CDM  
3. `core.preflight(cdm, mode)` → 报告  
4. 无 blocking → `exporters.pptx.build(cdm, mode)` 或 `POST /export/tasks`
