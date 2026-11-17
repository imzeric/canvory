import { z } from "zod";

export const exportModeSchema = z.enum(["auto", "editable", "fidelity"]);

export const scopeSchema = z
  .object({
    sceneIds: z.union([z.literal("all"), z.array(z.string())]),
    sort: z.enum(["position", "name"]).optional(),
  })
  .optional();

export const preflightBodySchema = z.object({
  document: z.unknown(),
  mode: exportModeSchema.default("auto"),
  scope: scopeSchema,
});

export const createTaskBodySchema = z.object({
  documentId: z.string().min(1),
  version: z.number().int().positive().optional(),
  mode: exportModeSchema,
  scope: scopeSchema,
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type PreflightBody = z.infer<typeof preflightBodySchema>;
