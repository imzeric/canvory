import type { HostOp } from "./host-ops.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function box(value: Record<string, unknown>): boolean {
  return ["x", "y", "width", "height"].every((key) => typeof value[key] === "number");
}

export function assertExecutableOps(input: unknown): HostOp[] {
  if (!Array.isArray(input)) throw new Error("HOST_OP_REJECTED");
  return input.map((item) => {
    if (!isRecord(item) || typeof item.op !== "string" || "code" in item) throw new Error("HOST_OP_REJECTED");
    if (item.op === "createBoard" && typeof item.name === "string" && typeof item.width === "number" && typeof item.height === "number") {
      return { op: "createBoard", name: item.name, width: item.width, height: item.height };
    }
    if (
      (item.op === "createText" || item.op === "createRectangle" || item.op === "createEllipse") &&
      typeof item.boardId === "string" &&
      typeof item.name === "string" &&
      box(item) &&
      (item.op !== "createText" || typeof item.text === "string")
    ) {
      if (item.op === "createText") {
        return { op: "createText", boardId: item.boardId, name: item.name, text: String(item.text), x: Number(item.x), y: Number(item.y), width: Number(item.width), height: Number(item.height) };
      }
      if (item.op === "createRectangle") {
        return { op: "createRectangle", boardId: item.boardId, name: item.name, x: Number(item.x), y: Number(item.y), width: Number(item.width), height: Number(item.height) };
      }
      return { op: "createEllipse", boardId: item.boardId, name: item.name, x: Number(item.x), y: Number(item.y), width: Number(item.width), height: Number(item.height) };
    }
    if (item.op === "uploadMedia" && typeof item.boardId === "string" && typeof item.mediaId === "string" && box(item)) {
      if (item.mediaId.includes("://") || item.mediaId.includes("..")) throw new Error("HOST_OP_REJECTED");
      return { op: "uploadMedia", boardId: item.boardId, mediaId: item.mediaId, x: Number(item.x), y: Number(item.y), width: Number(item.width), height: Number(item.height) };
    }
    if (item.op === "setPluginData") throw new Error("HOST_OP_REJECTED");
    throw new Error("HOST_OP_REJECTED");
  });
}
