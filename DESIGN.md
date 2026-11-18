---
name: Canvory on Penpot
description: 官方插件浮窗的亮色表单。2026-11-18 用户要求改用亮色主题并优化表单；此前的深色底 #181b1f 不再作为浮窗表面。
colors:
  panel: "#f4f7f6"
  panel-raised: "#ffffff"
  ink: "#1c2422"
  ink-muted: "#3e524c"
  line: "#d5ddd9"
  line-strong: "#c5d4ce"
  hover: "#e7f3f0"
  action-hover: "#0a5c54"
  selection: "#c9ebe4"
  action: "#0c6e64"
  action-ink: "#f7fffc"
  mount: "#e5f4f1"
  mount-ink: "#0d3d38"
  danger: "#8e2424"
  warning: "#8a5a12"
typography:
  ui:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  ui-strong:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "0"
  title:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "0"
  caption:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "2px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-quiet:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  mount-chip:
    backgroundColor: "{colors.mount}"
    textColor: "{colors.mount-ink}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
---

## Overview

2026-11-18 用户明确把浮窗改为亮色，并要求优化 PPT 表单。深色底 `#181b1f` 只留在修订记录里，不再画到浮窗上。

浮窗仍是 Penpot 2.4.3 的 `plugin-modal`。不改宿主，不做停靠侧栏，也不另做网页向导。画布、标尺和工具栏保持 Penpot 原样。

## Colors

| 令牌 | 色值 | 用途 |
|---|---|---|
| panel | `#f4f7f6` | 浮窗底，亮色中性 |
| panel-raised | `#ffffff` | 输入区 |
| ink | `#1c2422` | 正文 |
| ink-muted | `#3e524c` | 帮助文字，取自同一青绿，不用中性灰 |
| line | `#d5ddd9` | 分隔 |
| line-strong | `#c5d4ce` | 按钮描边 |
| hover | `#e7f3f0` | 次按钮悬停 |
| action-hover | `#0a5c54` | 主按钮悬停 |
| selection | `#c9ebe4` | 文字选区 |
| action | `#0c6e64` | 主操作 |
| action-ink | `#f7fffc` | 主操作上的字 |
| mount | `#e5f4f1` | 已挂载标签底 |
| mount-ink | `#0d3d38` | 已挂载标签字 |
| danger | `#8e2424` | 阻断和校验错误 |
| warning | `#8a5a12` | 可继续的警告 |

## Typography

中文 14px，思源黑体，回退苹方和微软雅黑。需求输入行高 1.55，随内容变高，不设字数上限。帮助和状态 12px。

## Layout

窄浮窗里只有一条从上到下的顺序：

1. PPT 模式，并写明这是可拖动、可关闭的插件浮窗。
2. 需求。多行输入是首要区域。生成是主按钮，绘制在已校验后才可用，停止只在校验进行时可用。
3. 资料。粘贴文字和引用。
4. 挂载页。名称、移除、锁定，和当前选区分开。
5. 结果。校验或绘制的一句话状态。
6. 技术与测试。连接、刷新和测试夹具默认折叠。未配置模型的说明留在需求区，不藏进折叠。

长需求在文本框内滚动。长画板名换行，不把浮窗撑出横向滚动。

## Components

主按钮是「生成」。绘制是次按钮，直到有已校验操作。测试夹具不是主路径。错误写在对应字段下。焦点用 2px 青绿描边。

## Do's and Don'ts

- 做：亮色表面、14px 中文、一组主操作、挂载和选区分开。
- 不做：恢复深色浮窗底；把测试夹具和调试信息跟需求平铺；改 Penpot 宿主。
