import { chunkText } from "./chunk.js";
import { parseHostOps, type HostOp } from "./host-ops.js";
import { buildModelRequest } from "./prompt.js";
import type { ModelChunk, ModelProvider } from "./provider.js";

export interface GenerationInput {
  demand: string;
  materials: { id: string; text: string }[];
  maxChars: number;
}

export interface GenerationResult {
  ops: HostOp[];
  sourceRefs: string[];
  system: string;
  user: string;
  drawn: false;
}

export async function generateWithProvider(
  provider: ModelProvider,
  input: GenerationInput,
  signal: AbortSignal,
): Promise<GenerationResult> {
  const demand = chunkText(input.demand, input.maxChars);
  const materialChunks: ModelChunk[] = [];
  const sourceRefs: string[] = [];
  for (const material of input.materials) {
    const parts = chunkText(material.text, input.maxChars);
    parts.forEach((part, index) => {
      const id = `material-${material.id}-${index + 1}`;
      materialChunks.push({ id, text: part.text });
      sourceRefs.push(id);
    });
  }
  const chunks = [...demand, ...materialChunks];
  const request = buildModelRequest(chunks);
  let payload = "";
  for await (const event of provider.complete({ chunks, signal })) {
    if ("error" in event) throw new Error(event.error);
    payload += event.text;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    throw new Error("HOST_OP_REJECTED");
  }
  return {
    ops: parseHostOps(parsed),
    sourceRefs,
    system: request.system,
    user: request.user,
    drawn: false,
  };
}
