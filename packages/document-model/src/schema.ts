import { z } from "zod";
import { CanvoryError } from "@canvory/shared";
import { SUPPORTED_CDM_SCHEMA_VERSIONS } from "@canvory/shared";
import type { CanvoryDocument } from "./types.js";

const transformSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
});

const textRunSchema = z.object({
  text: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.union([z.string(), z.number()]),
  italic: z.boolean().optional(),
  color: z.string(),
  underline: z.boolean().optional(),
});

const paintSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("solid"),
    color: z.string(),
    opacity: z.number().optional(),
  }),
  z.object({ type: z.literal("gradient") }),
  z.object({ type: z.literal("image"), assetId: z.string() }),
]);

const textNodeSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  transform: transformSchema,
  opacity: z.number().optional(),
  visible: z.boolean().optional(),
  content: z.object({ runs: z.array(textRunSchema) }),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
  valign: z.enum(["top", "middle", "bottom"]).optional(),
});

const shapeNodeSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  transform: transformSchema,
  opacity: z.number().optional(),
  visible: z.boolean().optional(),
  shapeKind: z.enum(["rect", "ellipse", "line"]),
  fill: paintSchema.optional(),
  stroke: z.object({ color: z.string(), width: z.number() }).optional(),
  radius: z.number().optional(),
  shadow: z
    .object({
      color: z.string(),
      blur: z.number(),
      offsetX: z.number(),
      offsetY: z.number(),
    })
    .optional(),
});

const imageNodeSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  transform: transformSchema,
  opacity: z.number().optional(),
  visible: z.boolean().optional(),
  assetId: z.string(),
});

const pathNodeSchema = z.object({
  id: z.string(),
  type: z.literal("path"),
  transform: transformSchema,
  opacity: z.number().optional(),
  visible: z.boolean().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  closed: z.boolean().optional(),
});

const nodeSchema: z.ZodType = z.lazy(() =>
  z.discriminatedUnion("type", [
    textNodeSchema,
    shapeNodeSchema,
    imageNodeSchema,
    pathNodeSchema,
    z.object({
      id: z.string(),
      type: z.literal("group"),
      transform: transformSchema,
      opacity: z.number().optional(),
      visible: z.boolean().optional(),
      children: z.array(nodeSchema),
    }),
  ]),
);

const assetRefSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "font", "svg", "audio", "video"]),
  storageKey: z.string().optional(),
  dataUrl: z.string().optional(),
  mimeType: z.string().optional(),
  hash: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  size: z.number().optional(),
});

const sceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["slide", "book-page", "animation-scene", "whiteboard", "web-section"]),
  width: z.number().optional(),
  height: z.number().optional(),
  background: paintSchema.optional(),
  children: z.array(nodeSchema),
  notes: z.string().optional(),
  duration: z.number().optional(),
});

export const canvoryDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  title: z.string(),
  type: z.enum(["presentation", "storybook", "animation", "whiteboard", "webpage"]),
  settings: z.object({
    width: z.number(),
    height: z.number(),
    unit: z.literal("px"),
    background: z.string().optional(),
    aspectRatio: z.string().optional(),
  }),
  themeId: z.string().optional(),
  scenes: z.array(sceneSchema).min(1),
  assets: z.array(assetRefSchema),
  animations: z.array(z.unknown()),
  interactions: z.array(z.unknown()),
  metadata: z.object({
    createdAt: z.number(),
    updatedAt: z.number(),
    version: z.number(),
  }),
  outline: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        status: z.enum(["pending", "drawing", "drawn", "failed", "stopped", "skipped_user_edit"]),
      }),
    )
    .optional()
    .default([]),
  charts: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["column", "bar", "line", "pie", "scatter"]),
        categories: z.array(z.string()),
        series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
      }),
    )
    .optional()
    .default([]),
});

export function parseCanvoryDocument(input: unknown): CanvoryDocument {
  const parsed = canvoryDocumentSchema.safeParse(input);
  if (!parsed.success) {
    throw new CanvoryError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    );
  }
  if (!SUPPORTED_CDM_SCHEMA_VERSIONS.includes(parsed.data.schemaVersion as "1.0.0" | "1.1.0")) {
    throw new CanvoryError(
      "SCHEMA_UNSUPPORTED",
      `SCHEMA_UNSUPPORTED：不支持的 schemaVersion，期望 ${SUPPORTED_CDM_SCHEMA_VERSIONS.join(" 或 ")}，实际 ${parsed.data.schemaVersion}`,
      400,
    );
  }
  return parsed.data as CanvoryDocument;
}
