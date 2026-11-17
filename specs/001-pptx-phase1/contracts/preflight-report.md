# Contract: Preflight / Export Report

**格式**: JSON  
**下载文件名建议**: `canvory-export-report-{timestamp}.json`  
**用户可见说明**: 简体中文（`messageZh`）

## 级别

| level | 含义 |
|-------|------|
| L0 | 原生可编辑 |
| L1 | 原生近似（可编辑，可能有轻微差异） |
| L2 | 栅格化（不可编辑） |
| L3 | 跳过 |

## Schema（逻辑）

```json
{
  "schemaVersion": "1.0.0",
  "mode": "auto",
  "blockingErrors": [
    { "code": "SIZE_MISMATCH", "messageZh": "各页画板尺寸不一致，已拒绝导出。" }
  ],
  "fonts": [
    {
      "sourceFamily": "Source Han Sans",
      "targetFamily": "微软雅黑",
      "installHintZh": "请确认接收方已安装目标字体。"
    }
  ],
  "totals": { "L0": 0, "L1": 0, "L2": 0, "L3": 0 },
  "pages": [
    {
      "sceneId": "scene-1",
      "name": "01_封面",
      "counts": { "L0": 0, "L1": 0, "L2": 0, "L3": 0 },
      "items": [
        {
          "nodeId": "n1",
          "level": "L2",
          "reasonCode": "EFFECT_BLUR",
          "messageZh": "模糊效果无法原生表达，已栅格化。"
        }
      ]
    }
  ]
}
```

## 不变式

- 预检报告与最终导出报告对同一 CDM+mode 的 level 判定 MUST 一致（栅格位图内容可因分辨率设置略有差异，但分级不得矛盾）。
- 凡 L2/L3 必须出现在 `items` 中（SC-006）。
- 第一阶段 `fonts` 仅提示，不表示已嵌入。
