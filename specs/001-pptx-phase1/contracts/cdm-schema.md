# Contract: CDM Schema

**Consumer**: `core`, `exporters/pptx`, `renderer/web-min`, `adapters/*`  
**Producer**: `adapters/penpot`, 手工 fixtures, 未来 Studio/AI

## 约定

- 媒体类型：`application/vnd.canvory.document+json`（逻辑名）
- 必含 `schemaVersion`；第一阶段实现支持 `1.0.0`
- 字段命名：英文 camelCase；枚举小写短横线或字符串字面量与 data-model 一致

## 最小合法文档（概念）

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "schemaVersion": "1.0.0",
  "title": "示例演示文稿",
  "type": "presentation",
  "settings": { "width": 1920, "height": 1080, "unit": "px" },
  "scenes": [
    {
      "id": "scene-1",
      "name": "01_封面",
      "type": "slide",
      "children": [],
      "notes": ""
    }
  ],
  "assets": [],
  "animations": [],
  "interactions": [],
  "metadata": { "createdAt": 0, "updatedAt": 0, "version": 1 }
}
```

## 不兼容变更

- 删除/重命名必填字段或更改含义 → 提升 MAJOR `schemaVersion` 并提供迁移
- 仅新增可选字段 → MINOR

完整字段见 [data-model.md](../data-model.md)。
