import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCanvoryDocument } from "@canvory/document-model";
import { renderDocumentHtml } from "@canvory/renderer-web-min";

const input = process.argv[2];
const output = process.argv[3] ?? "viewer-out.html";
if (!input) {
  console.error("用法: pnpm --filter @canvory/viewer-min render <cdm.json> [out.html]");
  process.exit(1);
}
const doc = parseCanvoryDocument(JSON.parse(readFileSync(resolve(input), "utf8")));
writeFileSync(resolve(output), renderDocumentHtml(doc));
console.log(`已写入 ${output}`);
