/**
 * SC-001 / SC-002 自动比率（T078）
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCanvoryDocument, type Node } from "@canvory/document-model";
import { preflight } from "@canvory/core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const goldenDir = resolve(root, "fixtures/golden");
const outDir = resolve(root, "docs/test/2-test-report");
mkdirSync(outDir, { recursive: true });

function walk(nodes: Node[], out: Node[] = []): Node[] {
  for (const n of nodes) {
    out.push(n);
    if (n.type === "group") walk(n.children, out);
  }
  return out;
}

const files = readdirSync(goldenDir).filter(
  (f) => f.startsWith("G-") && f.endsWith(".json") && !f.includes("NEG"),
);

let textDenom = 0;
let textNumer = 0;
let shapeDenom = 0;
let shapeNumer = 0;

for (const file of files) {
  const doc = parseCanvoryDocument(JSON.parse(readFileSync(resolve(goldenDir, file), "utf8")));
  const report = preflight(doc, "auto");
  const levelById = new Map(
    report.pages.flatMap((p) => p.items.map((i) => [i.nodeId, i.level] as const)),
  );
  for (const scene of doc.scenes) {
    for (const node of walk(scene.children)) {
      const level = levelById.get(node.id) ?? "L0";
      if (node.type === "text" && level !== "L3") {
        textDenom += 1;
        if (level === "L0" || level === "L1") textNumer += 1;
      }
      if (node.type === "shape" && (node.shapeKind === "rect" || node.shapeKind === "ellipse") && level !== "L3") {
        shapeDenom += 1;
        if (level === "L0" || level === "L1") shapeNumer += 1;
      }
    }
  }
}

const sc001 = textDenom ? textNumer / textDenom : 1;
const sc002 = shapeDenom ? shapeNumer / shapeDenom : 1;

const md = `# SC-001 / SC-002 自动计量

**日期**: ${new Date().toISOString()}  
**模式**: auto  
**样例**: ${files.join(", ")}

| 指标 | 分子 | 分母 | 比率 | 目标 | 结果 |
|------|------|------|------|------|------|
| SC-001 文本可编辑 | ${textNumer} | ${textDenom} | ${(sc001 * 100).toFixed(1)}% | ≥95% | ${sc001 >= 0.95 ? "PASS" : "FAIL"} |
| SC-002 基础图形原生 | ${shapeNumer} | ${shapeDenom} | ${(sc002 * 100).toFixed(1)}% | ≥90% | ${sc002 >= 0.9 ? "PASS" : "FAIL"} |
`;

writeFileSync(resolve(outDir, "sc001-sc002-rates.md"), md);
console.log(md);
if (sc001 < 0.95 || sc002 < 0.9) process.exit(1);
