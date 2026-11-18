import { assertProviderConfigured } from "@canvory/core";

const REGISTERED = new Set(["openai-compatible"]);

export type ProviderConfig = {
  id: "openai-compatible";
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  chunkChars: number;
};

export function providerFromEnv(env: NodeJS.ProcessEnv): ProviderConfig {
  assertProviderConfigured({
    CANVORY_MODEL_PROVIDER: env.CANVORY_MODEL_PROVIDER,
    CANVORY_MODEL_API_KEY: env.CANVORY_MODEL_API_KEY,
  });
  const id = env.CANVORY_MODEL_PROVIDER ?? "";
  if (!REGISTERED.has(id)) throw new Error("PROVIDER_UNKNOWN");
  const baseUrl = env.CANVORY_MODEL_BASE_URL ?? "";
  const model = env.CANVORY_MODEL_NAME ?? "";
  if (!baseUrl || !model) throw new Error("MODEL_PROVIDER_UNCONFIGURED");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("MODEL_PROVIDER_UNCONFIGURED");
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
    throw new Error("MODEL_PROVIDER_UNCONFIGURED");
  }
  const timeoutMs = Number(env.CANVORY_MODEL_TIMEOUT_MS ?? 30_000);
  const chunkChars = Number(env.CANVORY_MODEL_CHUNK_CHARS ?? 4_000);
  return {
    id: "openai-compatible",
    baseUrl,
    model,
    apiKey: env.CANVORY_MODEL_API_KEY as string,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
    chunkChars: Number.isFinite(chunkChars) && chunkChars > 0 ? chunkChars : 4_000,
  };
}
