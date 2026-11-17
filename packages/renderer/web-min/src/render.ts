import type { CanvoryDocument, Node } from "@canvory/document-model";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderNode(node: Node): string {
  if (node.visible === false) return "";
  const t = node.transform;
  const style = `position:absolute;left:${t.x}px;top:${t.y}px;width:${t.width}px;height:${t.height}px;transform:rotate(${t.rotation}deg);`;

  if (node.type === "group") {
    return `<div data-id="${escapeHtml(node.id)}" style="${style}">${node.children.map(renderNode).join("")}</div>`;
  }
  if (node.type === "text") {
    const text = node.content.runs.map((r) => r.text).join("");
    return `<div data-id="${escapeHtml(node.id)}" style="${style}overflow:hidden;">${escapeHtml(text)}</div>`;
  }
  if (node.type === "shape") {
    const bg =
      node.fill && node.fill.type === "solid" ? node.fill.color : "#ccc";
    const radius = node.shapeKind === "ellipse" ? "50%" : `${node.radius ?? 0}px`;
    return `<div data-id="${escapeHtml(node.id)}" style="${style}background:${bg};border-radius:${radius};"></div>`;
  }
  if (node.type === "image") {
    return `<div data-id="${escapeHtml(node.id)}" style="${style}background:#eee;" data-asset="${escapeHtml(node.assetId)}"></div>`;
  }
  return `<div data-id="${escapeHtml(node.id)}" style="${style}"></div>`;
}

/** 最小只读 HTML（架构验收用，非发布产品） */
export function renderDocumentHtml(doc: CanvoryDocument): string {
  const pages = doc.scenes
    .map((scene) => {
      const w = scene.width ?? doc.settings.width;
      const h = scene.height ?? doc.settings.height;
      return `<section data-scene="${escapeHtml(scene.id)}" style="position:relative;width:${w}px;height:${h}px;margin:16px auto;border:1px solid #ddd;background:#fff;">
  <h2 style="position:absolute;top:-1.5rem;left:0;font:12px sans-serif;margin:0;">${escapeHtml(scene.name)}</h2>
  ${scene.children.map(renderNode).join("")}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(doc.title)} — Canvory Viewer Min</title>
  <style>body{font-family:system-ui,sans-serif;background:#f6f6f6;margin:0;padding:24px;}</style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  <p>页数：${doc.scenes.length} · schemaVersion：${escapeHtml(doc.schemaVersion)}</p>
  ${pages}
</body>
</html>`;
}
