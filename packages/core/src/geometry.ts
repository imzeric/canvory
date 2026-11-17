/** 1920×1080 px → 13.333×7.5 in */
const BASE_W_PX = 1920;
const BASE_H_PX = 1080;
const BASE_W_IN = 13.333;
const BASE_H_IN = 7.5;

export function pxToInches(px: number, axis: "x" | "y", page: { width: number; height: number }): number {
  if (axis === "x") {
    const scale = BASE_W_IN / BASE_W_PX;
    return (px / page.width) * page.width * scale;
  }
  const scale = BASE_H_IN / BASE_H_PX;
  return (px / page.height) * page.height * scale;
}

/** 按页面实际宽高生成幻灯片英寸尺寸（非 16:9 亦按比例） */
export function slideSizeInches(page: { width: number; height: number }): {
  w: number;
  h: number;
} {
  const w = (page.width / BASE_W_PX) * BASE_W_IN;
  const h = (page.height / BASE_H_PX) * BASE_H_IN;
  return { w, h };
}

export function pxRectToInches(
  transform: { x: number; y: number; width: number; height: number },
  page: { width: number; height: number },
): { x: number; y: number; w: number; h: number } {
  const { w: slideW, h: slideH } = slideSizeInches(page);
  return {
    x: (transform.x / page.width) * slideW,
    y: (transform.y / page.height) * slideH,
    w: (transform.width / page.width) * slideW,
    h: (transform.height / page.height) * slideH,
  };
}
