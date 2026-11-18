import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { chunkText, parseHostOps, type HostOp } from "@canvory/core";
import type { AuthUser } from "../auth/auth.guard.js";
import { readMaterial, saveMaterial } from "./material-store.js";
import { createOpenAICompatible, ModelCallError } from "./openai-compatible.js";
import { providerFromEnv } from "./provider-factory.js";

export type GenerationBody = {
  drawn: false;
  ops: HostOp[];
  sourceRefs: string[];
  providerId: "openai-compatible";
};

@Injectable()
export class AssistantService {
  async addMaterial(user: AuthUser, fileId: string, text: string, mime = "text/plain", source?: { url?: string; path?: string }) {
    if (source?.url || source?.path) {
      throw new HttpException({ error: { code: "MATERIAL_SOURCE_UNSUPPORTED", message: "MATERIAL_SOURCE_UNSUPPORTED" } }, 400);
    }
    try {
      return await saveMaterial({
        ownerId: user.id,
        email: user.email,
        displayName: user.displayName,
        fileId,
        text,
        mime,
        storeBytes: true,
      });
    } catch (error) {
      throw materialError(error);
    }
  }

  async readOwnedMaterial(user: AuthUser, fileId: string, id: string) {
    const row = await readMaterial(user.id, fileId, id);
    if (!row) throw new NotFoundException({ error: { code: "MATERIAL_NOT_FOUND", message: "MATERIAL_NOT_FOUND" } });
    return { id: row.id, text: row.text, mime: row.mime };
  }

  async generate(
    user: AuthUser,
    fileId: string,
    demand: string,
    materialIds: string[],
    signal?: { aborted: boolean; addEventListener(type: "abort", listener: () => void): void; removeEventListener(type: "abort", listener: () => void): void },
  ): Promise<GenerationBody> {
    if (!fileId || fileId.length > 80 || fileId.includes("/") || fileId.includes("\\") || fileId.includes("..")) {
      throw new HttpException({ error: { code: "FILE_ID_INVALID", message: "FILE_ID_INVALID", drawn: false } }, 400);
    }
    const materials = [];
    for (const id of materialIds) materials.push(await this.readOwnedMaterial(user, fileId, id));
    let config;
    try {
      config = providerFromEnv(process.env);
    } catch (error) {
      const code = error instanceof Error && error.message === "PROVIDER_UNKNOWN" ? "PROVIDER_UNKNOWN" : "MODEL_PROVIDER_UNCONFIGURED";
      throw new HttpException({ error: { code, message: code, drawn: false } }, code === "PROVIDER_UNKNOWN" ? 400 : 503);
    }
    const demandChunks = chunkText(demand, config.chunkChars);
    const sourceRefs: string[] = [];
    const materialChunks = materials.flatMap((material) =>
      chunkText(material.text, config.chunkChars).map((part, index) => {
        const id = `material-${material.id}-${index + 1}`;
        sourceRefs.push(id);
        return { id, text: part.text };
      }),
    );
    try {
      const content = await createOpenAICompatible({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        timeoutMs: config.timeoutMs,
      }).complete({
        chunks: [...demandChunks, ...materialChunks],
        signal: (signal ?? new AbortController().signal) as AbortSignal,
      });
      let parsed: unknown;
      try {
        parsed = JSON.parse(content) as unknown;
      } catch {
        throw new ModelCallError("HOST_OP_REJECTED", 422);
      }
      return {
        drawn: false,
        ops: parseHostOps(parsed),
        sourceRefs,
        providerId: config.id,
      };
    } catch (error) {
      if (error instanceof ModelCallError) {
        throw new HttpException({ error: { code: error.message, message: error.message, drawn: false } }, error.status);
      }
      if (error instanceof Error && error.message === "HOST_OP_REJECTED") {
        throw new HttpException({ error: { code: "HOST_OP_REJECTED", message: "HOST_OP_REJECTED", drawn: false } }, 422);
      }
      throw error;
    }
  }
}

function materialError(error: unknown): HttpException {
  const code = error instanceof Error ? error.message : "MATERIAL_TEXT_INVALID";
  const status = code === "MATERIAL_TYPE_UNSUPPORTED" || code === "FILE_ID_INVALID" || code === "MATERIAL_TEXT_INVALID" ? 400 : 500;
  return new HttpException({ error: { code, message: code } }, status);
}
