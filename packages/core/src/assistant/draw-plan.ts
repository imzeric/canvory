import type { HostOp } from "./host-ops.js";

export const BOARD_REVISION_KEY = "canvory.board-rev";

export function opsForNewBoard(input: { name: string; text: string; width: number; height: number }): HostOp[] {
  return [
    { op: "createBoard", name: input.name, width: input.width, height: input.height },
    {
      op: "createText",
      boardId: "$new",
      name: `${input.name}-标题`,
      text: input.text,
      x: 120,
      y: 100,
      width: 880,
      height: 140,
    },
  ];
}

export function readBoardRevision(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
