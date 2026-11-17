---
name: Canvory Web PPT Studio
description: 浅色工作台提案。画布是桌上最亮的一张纸，周围界面退后。尚未实现，不是从已上线界面提取的。
colors:
  desk: "#d5dbe3"
  chrome: "#eef1f5"
  panel: "#f6f8fa"
  sheet: "#ffffff"
  ink: "#1a2332"
  ink-muted: "#5c6778"
  line: "#d5dbe3"
  select: "#1d4e89"
  select-wash: "#e7eef6"
  danger: "#8f2d2d"
  warning: "#8a5a12"
typography:
  ui:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0"
  ui-strong:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "15px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0"
  step-index:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.04em"
  slide-fallback:
    fontFamily: "\"Source Han Sans SC\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0"
rounded:
  sm: "2px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
  desk: "48px"
components:
  button-primary:
    backgroundColor: "{colors.select}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#163a68"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-quiet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0"
---

## Overview

这是实现前的视觉种子，供审核。仓库里没有网页主应用，本文件不是从已上线界面扫描出来的。

使用场景是白天的书桌：人坐在窗边改一份要讲的稿。幻灯片是桌上最亮的一张白纸，四周是凉灰色的桌面。界面用这张纸的边缘、对齐和留白来分层，不用大面积色块抢画布。

主色只用于选中和主按钮。数据图表的序列色写在图表数据上，不拿来装饰工具栏。

## Colors

| 令牌 | 色值 | 用途 |
|---|---|---|
| desk | `#d5dbe3` | 画布后面的桌面 |
| chrome | `#eef1f5` | 顶栏和步骤轨 |
| panel | `#f6f8fa` | 缩略图列和右侧面板 |
| sheet | `#ffffff` | 幻灯片纸 |
| ink | `#1a2332` | 正文 |
| ink-muted | `#5c6778` | 次要说明 |
| line | `#d5dbe3` | 分隔和纸的边缘 |
| select | `#1d4e89` | 选中框和主按钮 |
| select-wash | `#e7eef6` | 选中行的底 |
| danger | `#8f2d2d` | 阻断错误 |
| warning | `#8a5a12` | 可继续的警告 |

幻灯片纸与桌面的亮度差是层级的主要手段。面板比桌面略亮，仍暗于纸。不要把面板做成纯白，否则纸不再突出。

序列色（只用于图表数据，网页和 PPTX 使用同一组）：`#1d4e89`、`#b45309`、`#0f6b5c`、`#7a3048`、`#3f4c6b`、`#6b5b2a`。不靠颜色单独区分，旁边有序列名。

对比度没有仪器测量。ink 对 sheet、sheet 对 select 的组合在实现时要测，这里不写已达标。

## Typography

界面用思源黑体 / Noto Sans SC，回退到苹方和微软雅黑。中文不加大字距。大纲和属性面板行高 1.65，便于长段。步骤序号用同一字体的 650 字重，不另找展示体。

幻灯片上的字优先用模板点名的字体。模板字体缺失时，界面用 slide-fallback，并在预检里写明替换，不静默嵌入未授权字体。

数字和图表表用同一套中文黑体的等宽数字特性（`tabular-nums`），不引入第二套拉丁展示字体。

## Layout

向导：左侧 200px 步骤轨，中间阅读宽度 720px。大纲编辑器在这 720px 里撑满，随内容变高，不出现「已达上限」。

编辑器：左 220px 缩略图，右 320px 属性，中间剩余全部给桌面。纸的四周至少 48px 桌面。窗口变窄时先收起右侧为抽屉，缩略图改成顶上一行，纸保持可见。不把三列挤到字重叠。

中文长大纲在编辑器里连续滚动。步骤轨只标「大纲 / 编辑 / 属性 / 生成」，不把每一块大纲做成一屏卡片堆。

## Elevation & Depth

纸用 1px `line` 边和一层短阴影（`0 8px 24px rgb(26 35 50 / 12%)`）。阴影只属于纸和打开的菜单。面板不浮起来。选中框是 2px `select`，不靠发光。

动效：面板和选中 160ms，缓出。生成进度用步骤文字和已完成块数，不用循环闪烁。系统要求减少动效时，切换立即完成。

## Shapes

圆角停在 2px 和 6px。按钮 2px，面板 6px，幻灯片纸 2px。不做胶囊按钮，也不做大圆角卡片把纸和面板混成一类。

## Components

主按钮只有一个：当前步骤的「继续」或编辑器里的「导出」。其余是 quiet 按钮。破坏性动作（丢弃下游生成结果）用 danger 文字，不做成实心大红按钮，除非操作不可恢复。

缩略图是按比例缩小的纸，下面一行页名。选中态用 select-wash 和左侧 2px 条。拖动时原位留线，不把缩略图放大成第二块画布。

图表在纸上按数据绘制，纸外的属性面板永远有同一张数据表。表是编辑入口，图是结果。

## Do's and Don'ts

- 做：让纸比周围更亮；长文用同一套黑体；错误写在发生它的字段旁。
- 不做：暖米色底配衬线标题；把主色铺满顶栏；用截图冒充图表；在中文段落上加宽字距；用动画掩盖未完成的块。
