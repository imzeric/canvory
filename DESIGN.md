---
name: Canvory on Penpot
description: 助手浮窗的视觉种子。画布仍是 Penpot 的画布。尚未实现，不是从已上线界面提取的。
colors:
  panel: "#181b1f"
  panel-raised: "#22272d"
  ink: "#e7ecec"
  ink-muted: "#9aa6ad"
  line: "#343b42"
  action: "#11b3a2"
  action-ink: "#06211e"
  mount: "#16332f"
  danger: "#e07a72"
  warning: "#e0b15a"
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
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
---

## Overview

这是实现前的浮窗种子，供审核。2026-11-17 那版浅色独立工作台不再是当前方案。

Penpot 2.4.3 的插件 UI 是 `plugin-modal`：绝对定位、可调大小、叠在画布上，不是停靠侧栏（`frontend/resources/plugins-runtime/index.js` 的 `plugin-modal`）。画布的层级、标尺和工具栏保持 Penpot 原样。助手只占一块有边界的浮窗，让画布仍是主表面。

浮窗跟随 `themechange`。下面的色值是深色主题下的回退，不是第二套品牌。选中色取自这套深色界面里已经出现的青绿，避免再引入另一套蓝。

## Colors

| 令牌 | 色值 | 用途 |
|---|---|---|
| panel | `#181b1f` | 浮窗底 |
| panel-raised | `#22272d` | 输入区和次按钮 |
| ink | `#e7ecec` | 浮窗正文 |
| ink-muted | `#9aa6ad` | 状态和来源 |
| line | `#343b42` | 分隔 |
| action | `#11b3a2` | 唯一主操作 |
| action-ink | `#06211e` | 主操作上的字 |
| mount | `#16332f` | 已挂载画板的标签 |
| danger | `#e07a72` | 阻断 |
| warning | `#e0b15a` | 可继续的警告 |

画布上的画板填充仍由模板背景决定，不用浮窗色去涂画板。图表序列色沿用数据表里的六色，不拿来装饰浮窗。

## Typography

浮窗字号对齐插件运行时的 `--font-size-m: 14px`。中文用思源黑体，回退苹方和微软雅黑，不加字距。需求输入行高 1.55，随内容变高，不设字数上限。章节行用 12px 说明状态，不和正文抢。

画板上的字用模板字体。缺失时回退到同一套黑体，并在预检里写明。

## Layout

浮窗内部从上到下，只有一条阅读顺序：

1. 模式。PPT 是当前唯一会画板的模式，用分段控制标明，不做成向导步骤。
2. 挂载。横排名称标签，可移除。标签不是缩略画布。
3. 需求与资料。浮窗里最大的文本区。
4. 章节。一行一节，右侧是状态。
5. 主按钮。绘制，或在已挂载时改为「应用到挂载」。停止是次按钮。
6. 仅当挂载对象是图表时，才展开数据表。

浮窗默认不盖住整块画布。Penpot 运行时把宽高限制在窗口内（最小约 200，默认约 335×590）。窄窗口时浮窗内部改为上下滚动，不把挂载标签折成无法点的图标。

## Elevation & Depth

浮窗沿用宿主已有的描边和阴影，不另加发光。挂载标签没有阴影。主按钮不跳动。进度是章节行上的文字「第 i / n」，减少动效时立即切换。

## Shapes

浮窗外角 8px，与宿主 `plugin-modal` 的圆角同级。内部按钮和标签 2px，避免变成胶囊后和 Penpot 的工具条混淆。

## Components

主按钮同时只存在一个。关闭浮窗是宿主标题栏上的关闭，不在内容区再做一个主按钮。

挂载标签显示画板名和移除。锁定是标签上的单独动作，锁定后该画板不接受生成写入。

错误写在需求区或对应章节行下，不使用全屏对话框挡住画布。

## Do's and Don'ts

- 做：让 Penpot 画布保持可见；挂载名单和当前选区同时可见且样式不同；长中文在浮窗内滚动。
- 不做：把浮窗画成独立站点的三栏工作台；用步骤轨强迫六步；用暖色纸面盖住 Penpot；把图表预览画得比数据表更像可以改数的地方。
