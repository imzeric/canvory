import { assertProviderConfigured } from "@canvory/core";

export function providerFromEnv(env: NodeJS.ProcessEnv): { id: string } {
  assertProviderConfigured({
    CANVORY_MODEL_PROVIDER: env.CANVORY_MODEL_PROVIDER,
    CANVORY_MODEL_API_KEY: env.CANVORY_MODEL_API_KEY,
  });
  return { id: env.CANVORY_MODEL_PROVIDER as string };
}
