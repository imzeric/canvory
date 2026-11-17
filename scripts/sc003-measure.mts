/**
 * SC-003 LibreOffice 无头测量（T079）
 * 无 soffice 时记录 SKIP；有则转换 PPTX→PDF 并记命令输出。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCanvoryDocument } from "@canvory/document-model";
import { buildPptx } from "@canvory/exporter-pptx";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "docs/test/2-test-report");
const artDir = resolve(outDir, "sc003-artifacts");
mkdirSync(artDir, { recursive: true });

function findSoffice(): string | null {
  for (const c of ["soffice", "libreoffice"]) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

async function main() {
  const fixture = resolve(root, "fixtures/golden/G-TEXT-01.json");
  const doc = parseCanvoryDocument(JSON.parse(readFileSync(fixture, "utf8")));
  const { buffer } = await buildPptx(doc);
  const pptxPath = resolve(artDir, "G-TEXT-01.pptx");
  writeFileSync(pptxPath, buffer);

  const bin = findSoffice();
  if (!bin) {
    const md = `# SC-003 位置误差测量

**日期**: ${new Date().toISOString()}  
**结果**: SKIP — 本机未安装 LibreOffice/soffice  

规程见 \`fixtures/golden/metrics.md\`。安装后重跑：\`pnpm exec tsx scripts/sc003-measure.mts\`
`;
    writeFileSync(resolve(outDir, "sc003-measure.md"), md);
    console.log(md);
    return;
  }

  const conv = spawnSync(
    bin,
    ["--headless", "--convert-to", "pdf", "--outdir", artDir, pptxPath],
    { encoding: "utf8" },
  );
  const pdfPath = resolve(artDir, "G-TEXT-01.pdf");
  const md = `# SC-003 位置误差测量

**日期**: ${new Date().toISOString()}  
**工具**: ${bin}  
**convert exit**: ${conv.status}  
**PDF**: ${existsSync(pdfPath) ? pdfPath : "未生成"}  

\`\`\`
${conv.stdout || ""}
${conv.stderr || ""}
\`\`\`

锚点抽样需人工/图像脚本对比 CDM transform 中心点（目标误差 ≤0.5% 页宽）。
`;
  writeFileSync(resolve(outDir, "sc003-measure.md"), md);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
