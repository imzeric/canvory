import { z } from "zod";

export type HostOp =
  | { op: "createBoard"; name: string; width: number; height: number }
  | {
      op: "createText";
      boardId: string;
      name: string;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | { op: "createRectangle"; boardId: string; name: string; x: number; y: number; width: number; height: number }
  | { op: "createEllipse"; boardId: string; name: string; x: number; y: number; width: number; height: number }
  | { op: "setPluginData"; target: "file" | "board"; id: string; key: string; value: string }
  | { op: "uploadMedia"; boardId: string; mediaId: string; x: number; y: number; width: number; height: number }
  | { op: "replaceText"; nodeId: string; text: string };

const box = {
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
};

const createBoard = z.object({ op: z.literal("createBoard"), name: z.string(), width: z.number(), height: z.number() }).strict();
const createText = z
  .object({
    op: z.literal("createText"),
    boardId: z.string(),
    name: z.string(),
    text: z.string(),
    ...box,
  })
  .strict();
const createRectangle = z
  .object({ op: z.literal("createRectangle"), boardId: z.string(), name: z.string(), ...box })
  .strict();
const createEllipse = z.object({ op: z.literal("createEllipse"), boardId: z.string(), name: z.string(), ...box }).strict();
const setPluginData = z
  .object({
    op: z.literal("setPluginData"),
    target: z.enum(["file", "board"]),
    id: z.string(),
    key: z.string(),
    value: z.string(),
  })
  .strict();
const uploadMedia = z.object({ op: z.literal("uploadMedia"), boardId: z.string(), mediaId: z.string(), ...box }).strict();
const replaceText = z.object({ op: z.literal("replaceText"), nodeId: z.string(), text: z.string() }).strict();

export function isReservedPluginKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    normalized.startsWith("canvory.") ||
    normalized === "canvory" ||
    normalized.startsWith("__") ||
    normalized.includes("..")
  );
}

export function parseHostOps(input: unknown): HostOp[] {
  const parsed = z
    .array(z.union([createBoard, createText, createRectangle, createEllipse, setPluginData, uploadMedia, replaceText]))
    .safeParse(input);
  if (!parsed.success) throw new Error("HOST_OP_REJECTED");
  for (const op of parsed.data) {
    if (op.op === "setPluginData" && (isReservedPluginKey(op.key) || op.key.length > 64)) {
      throw new Error("HOST_OP_REJECTED");
    }
    if (op.op === "uploadMedia" && (op.mediaId.includes("://") || op.mediaId.includes(".."))) {
      throw new Error("HOST_OP_REJECTED");
    }
  }
  return parsed.data;
}
