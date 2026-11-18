/** 所选页数超过此值时，导出入口默认建议后台导出 */
export const PAGE_SOFT_LIMIT = 20;

/** 浏览器导出已用时达到此毫秒数仍未完成时，提示改走后台 */
export const BROWSER_EXPORT_HINT_MS = 25_000;

/** ≤ PAGE_SOFT_LIMIT 页时浏览器导出目标完成时间（毫秒） */
export const BROWSER_EXPORT_TARGET_MS = 30_000;

/** 可尝试原生映射的折线最大点数；超出则 L2 栅格化 */
export const SIMPLE_PATH_MAX_POINTS = 8;

export const SUPPORTED_CDM_SCHEMA_VERSION = "1.0.0";

export const SUPPORTED_CDM_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const;
