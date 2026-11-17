import type { Node } from "@canvory/document-model";
import { SIMPLE_PATH_MAX_POINTS } from "@canvory/shared";
import type { ExportMode } from "./modes.js";
import { MODE_POLICIES } from "./modes.js";

export type DegradeLevel = "L0" | "L1" | "L2" | "L3";

export interface DegradeResult {
  nodeId: string;
  level: DegradeLevel;
  reasonCode: string;
  messageZh: string;
}

export interface ClassifyContext {
  /** 场景画幅，用于溢出检测 */
  sceneWidth?: number;
  sceneHeight?: number;
}

function isEmptyText(node: Node): boolean {
  if (node.type !== "text") return false;
  return node.content.runs.every((r) => r.text.trim().length === 0);
}

function overflowsScene(node: Node, ctx?: ClassifyContext): boolean {
  if (!ctx?.sceneWidth || !ctx?.sceneHeight) return false;
  const { x, y, width, height } = node.transform;
  return x < 0 || y < 0 || x + width > ctx.sceneWidth || y + height > ctx.sceneHeight;
}

export function classifyNode(
  node: Node,
  mode: ExportMode = "auto",
  ctx?: ClassifyContext,
): DegradeResult {
  const policy = MODE_POLICIES[mode];

  if (node.visible === false) {
    return {
      nodeId: node.id,
      level: "L3",
      reasonCode: "HIDDEN",
      messageZh: "隐藏图层已跳过。",
    };
  }

  if (node.transform.width <= 0 || node.transform.height <= 0) {
    return {
      nodeId: node.id,
      level: "L3",
      reasonCode: "ZERO_SIZE",
      messageZh: "零尺寸元素已跳过。",
    };
  }

  if (isEmptyText(node)) {
    return {
      nodeId: node.id,
      level: "L3",
      reasonCode: "EMPTY_TEXT",
      messageZh: "空文本已跳过。",
    };
  }

  if (overflowsScene(node, ctx)) {
    return {
      nodeId: node.id,
      level: policy.preferNative ? "L1" : "L2",
      reasonCode: "OVERFLOW_CLIP",
      messageZh: "元素超出画板边界，导出时可能被裁切；已记入告警。",
    };
  }

  if (node.type === "path") {
    if (node.points.length > SIMPLE_PATH_MAX_POINTS) {
      if (policy.pathComplexAsL2) {
        return {
          nodeId: node.id,
          level: "L2",
          reasonCode: "PATH_TOO_COMPLEX",
          messageZh: `路径点数超过 ${SIMPLE_PATH_MAX_POINTS}，已栅格化。`,
        };
      }
      return {
        nodeId: node.id,
        level: "L1",
        reasonCode: "PATH_COMPLEX_APPROX",
        messageZh: "可编辑优先：复杂路径以折线近似，可能有差异。",
      };
    }
    return {
      nodeId: node.id,
      level: "L1",
      reasonCode: "PATH_APPROX",
      messageZh: "简单路径以线条近似导出，可能有轻微差异。",
    };
  }

  if (node.type === "group") {
    return {
      nodeId: node.id,
      level: "L0",
      reasonCode: "GROUP_EXPAND",
      messageZh: "分组将展开为子元素。",
    };
  }

  if (
    node.type === "shape" &&
    node.radius &&
    node.radius > 0 &&
    (policy.roundedAsL2 || policy.rasterizeEffectsAggressively)
  ) {
    return {
      nodeId: node.id,
      level: "L2",
      reasonCode: "FIDELITY_RASTER",
      messageZh: "高保真模式：圆角形状栅格化以贴近视觉。",
    };
  }

  if (node.type === "shape" && node.shadow) {
    if (policy.rasterizeEffectsAggressively) {
      return {
        nodeId: node.id,
        level: "L2",
        reasonCode: "SHADOW_RASTER",
        messageZh: "外阴影能力外，已栅格化。",
      };
    }
    return {
      nodeId: node.id,
      level: "L1",
      reasonCode: "SHADOW_APPROX",
      messageZh: "外阴影以近似效果导出，可能有差异。",
    };
  }

  if (node.type === "text" || node.type === "shape" || node.type === "image") {
    return {
      nodeId: node.id,
      level: "L0",
      reasonCode: "NATIVE",
      messageZh: "可映射为原生对象。",
    };
  }

  const exhaustive: never = node;
  return {
    nodeId: (exhaustive as Node).id,
    level: "L2",
    reasonCode: "UNKNOWN",
    messageZh: "未知类型，已栅格化。",
  };
}

export function walkNodes(
  nodes: Node[],
  mode: ExportMode,
  out: DegradeResult[] = [],
  ctx?: ClassifyContext,
): DegradeResult[] {
  for (const node of nodes) {
    const result = classifyNode(node, mode, ctx);
    out.push(result);
    if (node.type === "group") {
      walkNodes(node.children, mode, out, ctx);
    }
  }
  return out;
}
