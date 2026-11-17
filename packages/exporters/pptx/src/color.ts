/** PptxGenJS 需要 6 位 RGB（无 #） */
export function toPptxRgb(input: string | undefined, fallback = "000000"): string {
  if (!input) return fallback;
  let hex = input.replace("#", "").trim();
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return hex.toUpperCase();
  return fallback;
}
