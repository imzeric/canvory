import type { CanvoryDocument, Node } from "@canvory/document-model";

export interface FontMappingConfig {
  sourceFamily: string;
  targetFamily: string;
  enabled: boolean;
}

const DEFAULT_MAP: FontMappingConfig[] = [
  { sourceFamily: "Source Han Sans", targetFamily: "微软雅黑", enabled: true },
  { sourceFamily: "Inter", targetFamily: "Arial", enabled: true },
];

export function mapFontFamily(
  source: string,
  table: FontMappingConfig[] = DEFAULT_MAP,
): string {
  const hit = table.find((r) => r.enabled && r.sourceFamily === source);
  return hit?.targetFamily ?? source;
}

function collectFromNodes(nodes: Node[], set: Set<string>): void {
  for (const node of nodes) {
    if (node.type === "text") {
      for (const run of node.content.runs) set.add(run.fontFamily);
    }
    if (node.type === "group") collectFromNodes(node.children, set);
  }
}

export function collectFonts(
  doc: CanvoryDocument,
  table: FontMappingConfig[] = DEFAULT_MAP,
): Array<{ sourceFamily: string; targetFamily: string; installHintZh: string }> {
  const set = new Set<string>();
  for (const scene of doc.scenes) collectFromNodes(scene.children, set);
  return [...set].map((sourceFamily) => {
    const targetFamily = mapFontFamily(sourceFamily, table);
    return {
      sourceFamily,
      targetFamily,
      installHintZh: `请确认接收方已安装字体「${targetFamily}」（本阶段不嵌入字体）。`,
    };
  });
}
