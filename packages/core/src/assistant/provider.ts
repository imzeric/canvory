export interface ModelChunk {
  id: string;
  text: string;
}

export type ModelEvent = { chunkId: string; text: string } | { chunkId: string; error: string };

export interface ModelProvider {
  id: string;
  complete(input: { chunks: ModelChunk[]; signal: AbortSignal }): AsyncIterable<ModelEvent>;
}

export function assertProviderConfigured(env: {
  CANVORY_MODEL_PROVIDER?: string;
  CANVORY_MODEL_API_KEY?: string;
}): void {
  if (!env.CANVORY_MODEL_PROVIDER || !env.CANVORY_MODEL_API_KEY) {
    throw new Error("MODEL_PROVIDER_UNCONFIGURED");
  }
}

export class MockModelProvider implements ModelProvider {
  id = "mock";

  async *complete(input: { chunks: ModelChunk[]; signal: AbortSignal }): AsyncIterable<ModelEvent> {
    for (const chunk of input.chunks) {
      if (input.signal.aborted) return;
      yield { chunkId: chunk.id, text: `MOCK:${chunk.text}` };
    }
  }
}
