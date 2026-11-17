#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCanvoryDocument } from "@canvory/document-model";
import { buildPptx } from "../src/build.js";

async function main() {
  const input = process.argv[2];
  const output = process.argv[3] ?? "out.pptx";
  if (!input) {
    console.error("用法: pnpm --filter @canvory/exporter-pptx export-file <cdm.json> [out.pptx]");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(resolve(input), "utf8"));
  const doc = parseCanvoryDocument(raw);
  const { buffer, report } = await buildPptx(doc);
  writeFileSync(resolve(output), buffer);
  console.log(`已写入 ${output}`);
  console.log(`报告 totals: ${JSON.stringify(report.totals)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
