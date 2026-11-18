import { buildModelRequest, type ModelChunk } from "@canvory/core";

export class ModelCallError extends Error {
  constructor(
    message: "MODEL_RATE_LIMITED" | "MODEL_TIMEOUT" | "MODEL_CANCELLED" | "MODEL_NETWORK" | "HOST_OP_REJECTED" | "MODEL_UPSTREAM",
    readonly status: number,
  ) {
    super(message);
  }
}

export type ChatFetch = (url: string, init: RequestInit) => Promise<Response>;

export function createOpenAICompatible(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: ChatFetch;
}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: "openai-compatible" as const,
    async complete(input: { chunks: ModelChunk[]; signal: AbortSignal }): Promise<string> {
      const request = buildModelRequest(input.chunks);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      const onAbort = () => controller.abort();
      if (input.signal.aborted) controller.abort();
      else input.signal.addEventListener("abort", onAbort, { once: true });
      try {
        const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
          }),
          signal: controller.signal,
        });
        if (response.status === 429) throw new ModelCallError("MODEL_RATE_LIMITED", 429);
        if (!response.ok) throw new ModelCallError("MODEL_UPSTREAM", 502);
        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
        const content = payload.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.length === 0) throw new ModelCallError("HOST_OP_REJECTED", 422);
        return content;
      } catch (error) {
        if (error instanceof ModelCallError) throw error;
        if (input.signal.aborted) throw new ModelCallError("MODEL_CANCELLED", 408);
        if (controller.signal.aborted) throw new ModelCallError("MODEL_TIMEOUT", 504);
        throw new ModelCallError("MODEL_NETWORK", 502);
      } finally {
        clearTimeout(timer);
        input.signal.removeEventListener("abort", onAbort);
      }
    },
  };
}

