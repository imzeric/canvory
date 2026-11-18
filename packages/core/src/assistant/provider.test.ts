import { describe, expect, it } from "vitest";
import { assertProviderConfigured, MockModelProvider } from "./provider.js";

describe("provider", () => {
  it("rejects generation when the provider env is empty", () => {
    expect(() => assertProviderConfigured({})).toThrow("MODEL_PROVIDER_UNCONFIGURED");
    expect(() => assertProviderConfigured({ CANVORY_MODEL_PROVIDER: "vendor" })).toThrow("MODEL_PROVIDER_UNCONFIGURED");
  });

  it("mock provider echoes chunk text and is not a live vendor", async () => {
    const provider = new MockModelProvider();
    const events = [];
    for await (const event of provider.complete({
      chunks: [{ id: "chunk-1", text: "需求" }],
      signal: new AbortController().signal,
    })) {
      events.push(event);
    }
    expect(events).toEqual([{ chunkId: "chunk-1", text: "MOCK:需求" }]);
    expect(provider.id).toBe("mock");
  });
});
