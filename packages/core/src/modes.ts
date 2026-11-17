export type ExportMode = "auto" | "editable" | "fidelity";

export interface ModePolicy {
  preferNative: boolean;
  /** fidelity：复杂效果更易 L2 */
  rasterizeEffectsAggressively: boolean;
  /** editable：简单路径/圆角倾向 L1 告警而非 L2 */
  pathComplexAsL2: boolean;
  roundedAsL2: boolean;
}

export const MODE_POLICIES: Record<ExportMode, ModePolicy> = {
  auto: {
    preferNative: true,
    rasterizeEffectsAggressively: false,
    pathComplexAsL2: true,
    roundedAsL2: false,
  },
  editable: {
    preferNative: true,
    rasterizeEffectsAggressively: false,
    pathComplexAsL2: false,
    roundedAsL2: false,
  },
  fidelity: {
    preferNative: false,
    rasterizeEffectsAggressively: true,
    pathComplexAsL2: true,
    roundedAsL2: true,
  },
};

export const EXPORT_MODES: ExportMode[] = ["auto", "editable", "fidelity"];

export function isExportMode(v: unknown): v is ExportMode {
  return typeof v === "string" && (EXPORT_MODES as string[]).includes(v);
}
