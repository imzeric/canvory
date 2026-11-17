/**
 * pptxgenjs 在浏览器里拒绝 nodebuffer（jszip: not supported by this platform）。
 * Node 继续用 nodebuffer；有 window 的宿主改用 uint8array，下载侧已接受 Uint8Array。
 */
export type PptxWriteOutputType = "nodebuffer" | "uint8array";

export function pptxWriteOutputType(
  scope: { hasWindow?: boolean } = {},
): PptxWriteOutputType {
  const hasWindow =
    scope.hasWindow ??
    (typeof globalThis !== "undefined" && "document" in globalThis);
  return hasWindow ? "uint8array" : "nodebuffer";
}
