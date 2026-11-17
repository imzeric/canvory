import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseCanvoryDocument } from "@canvory/document-model";
import { buildPptx } from "@canvory/exporter-pptx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "docs/test/2-test-report/compat-artifacts");
mkdirSync(out, { recursive: true });

const doc = parseCanvoryDocument(
  JSON.parse(readFileSync(resolve(root, "fixtures/golden/G-TEXT-01.json"), "utf8")),
);
const { buffer } = await buildPptx(doc);
const pptx = resolve(out, "G-TEXT-01.pptx");
writeFileSync(pptx, buffer);

const unzip = spawnSync("unzip", ["-l", pptx], { encoding: "utf8" });
const ok =
  unzip.status === 0 &&
  unzip.stdout.includes("[Content_Types].xml") &&
  unzip.stdout.includes("ppt/presentation.xml");

const md = `# PPTX 结构冒烟

**日期**: ${new Date().toISOString()}  
**结果**: ${ok ? "PASS" : "FAIL"}  

\`\`\`
${unzip.stdout.slice(0, 2000)}
\`\`\`
`;
writeFileSync(resolve(root, "docs/test/2-test-report/pptx-structure-smoke.md"), md);
console.log(md);
if (!ok) process.exit(1);
