import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { chunkText } from "@canvory/core";
import { memory } from "../db/pool.js";
import { providerFromEnv } from "./provider-factory.js";

@Injectable()
export class AssistantService {
  addMaterial(fileId: string, text: string): { id: string } {
    const id = randomUUID();
    memory.materials.set(id, { id, fileId, text });
    return { id };
  }

  readMaterial(fileId: string, id: string): { id: string; text: string } {
    const row = memory.materials.get(id);
    if (!row || row.fileId !== fileId) {
      throw new NotFoundException({ error: { code: "MATERIAL_NOT_FOUND", message: "MATERIAL_NOT_FOUND" } });
    }
    return { id: row.id, text: row.text };
  }

  async generate(fileId: string, demand: string, materialIds: string[]): Promise<never> {
    for (const id of materialIds) this.readMaterial(fileId, id);
    const prepared = chunkText(demand, 4000);
    try {
      const configured = providerFromEnv(process.env);
      throw new HttpException(
        {
          error: {
            code: "PROVIDER_ADAPTER_MISSING",
            message: "PROVIDER_ADAPTER_MISSING",
            providerId: configured.id,
            preparedChunks: prepared.length,
            drawn: false,
          },
        },
        501,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error && error.message === "MODEL_PROVIDER_UNCONFIGURED") {
        throw new HttpException(
          {
            error: {
              code: "MODEL_PROVIDER_UNCONFIGURED",
              message: "MODEL_PROVIDER_UNCONFIGURED",
              preparedChunks: prepared.length,
              drawn: false,
            },
          },
          503,
        );
      }
      throw error;
    }
  }
}
