import { readFileSync } from "node:fs";
import { HttpException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { memory } from "../db/pool.js";
import { AssistantService } from "./assistant.service.js";
import { providerFromEnv } from "./provider-factory.js";

describe("assistant generation", () => {
  beforeEach(() => {
    memory.materials.clear();
    delete process.env.CANVORY_MODEL_PROVIDER;
    delete process.env.CANVORY_MODEL_API_KEY;
  });

  it("keeps material text on the file that stored it", () => {
    const service = new AssistantService();
    const saved = service.addMaterial("file-a", "只属于文件甲");
    expect(service.readMaterial("file-a", saved.id).text).toBe("只属于文件甲");
    expect(() => service.readMaterial("file-b", saved.id)).toThrow(NotFoundException);
  });

  it("returns 503 when the provider is not configured and does not draw", async () => {
    const service = new AssistantService();
    const saved = service.addMaterial("file-a", "资料");
    try {
      await service.generate("file-a", "做封面", [saved.id]);
      throw new Error("should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const http = error as HttpException;
      expect(http.getStatus()).toBe(503);
      expect(JSON.stringify(http.getResponse())).toContain("MODEL_PROVIDER_UNCONFIGURED");
      expect(JSON.stringify(http.getResponse())).not.toContain("createBoard");
    }
  });

  it("does not use the mock provider when env is set", async () => {
    process.env.CANVORY_MODEL_PROVIDER = "named-vendor";
    process.env.CANVORY_MODEL_API_KEY = "present";
    const service = new AssistantService();
    try {
      await service.generate("file-a", "做封面", []);
      throw new Error("should have failed");
    } catch (error) {
      const http = error as HttpException;
      expect(http.getStatus()).toBe(501);
      const body = JSON.stringify(http.getResponse());
      expect(body).toContain("PROVIDER_ADAPTER_MISSING");
      expect(body).not.toContain("MOCK:");
      expect(body).not.toContain("createBoard");
    }
  });

  it("does not register the mock provider in the server entry", () => {
    expect(() => providerFromEnv({})).toThrow("MODEL_PROVIDER_UNCONFIGURED");
    const factory = readFileSync(new URL("./provider-factory.ts", import.meta.url), "utf8");
    const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
    expect(factory).not.toContain("MockModelProvider");
    expect(main).not.toContain("MockModelProvider");
  });
});
