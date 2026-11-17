/**
 * L2 栅格化钩子：实际位图由运行环境注入（插件 canvas / worker）。
 * MUST NOT 将结果写回 CDM 作为唯一真相（FR-015）。
 */
export interface RasterizeRequest {
  nodeId: string;
  widthPx: number;
  heightPx: number;
  maxEdgePx?: number;
  /** 占位色（无宿主时） */
  fillHex?: string;
}

export interface RasterizeResult {
  nodeId: string;
  mimeType: "image/png";
  /** data URL；仅用于导出管道，不写回 CDM */
  data: string;
}

export type RasterizeFn = (req: RasterizeRequest) => Promise<RasterizeResult | null>;

/** 1×1 PNG（灰）——无宿主 rasterize 时的确定性占位，仍按节点框嵌入 */
const PLACEHOLDER_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function rasterizePlaceholder(req: RasterizeRequest): Promise<RasterizeResult> {
  return {
    nodeId: req.nodeId,
    mimeType: "image/png",
    data: PLACEHOLDER_PNG,
  };
}

/** 解析可选注入；缺省用占位 PNG（保证 L2 走图片对象路径） */
export async function resolveRaster(
  req: RasterizeRequest,
  fn?: RasterizeFn | null,
): Promise<RasterizeResult> {
  if (fn) {
    const out = await fn(req);
    if (out) return out;
  }
  return rasterizePlaceholder(req);
}
