import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseCanvoryDocument } from "@canvory/document-model";
import { renderDocumentHtml } from "@canvory/renderer-web-min";

const port = Number(process.env.PORT ?? 4500);
const file = process.argv[2];

createServer((req, res) => {
  try {
    if (!file || !existsSync(file)) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("请传入 CDM JSON 路径: pnpm --filter @canvory/viewer-min start -- fixtures/golden/G-TEXT-01.json");
      return;
    }
    const doc = parseCanvoryDocument(JSON.parse(readFileSync(resolve(file), "utf8")));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderDocumentHtml(doc));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(e instanceof Error ? e.message : String(e));
  }
}).listen(port, () => {
  console.log(`viewer-min http://localhost:${port}`);
});
