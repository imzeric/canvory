import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { AuthGuard } from "../auth/auth.guard.js";
import { memory } from "../db/pool.js";
import { getObject, putObject } from "../storage/minio.js";

@Controller("v1/assets")
@UseGuards(AuthGuard)
export class AssetsController {
  @Post("presign")
  presign(
    @Body()
    body: {
      filename: string;
      mime: string;
      byteSize: number;
      documentId?: string;
    },
  ) {
    const id = randomUUID();
    const storageKey = `uploads/${id}/${body.filename}`;
    memory.assets.set(id, {
      id,
      kind: "upload",
      mime: body.mime,
      byteSize: body.byteSize,
      storageKey,
      documentId: body.documentId ?? null,
      createdAt: new Date().toISOString(),
    });
    return {
      assetId: id,
      uploadUrl: `/api/v1/assets/${id}/upload`,
      storageKey,
      headers: { "Content-Type": body.mime },
    };
  }

  @Get(":id")
  get(@Param("id") id: string) {
    const a = memory.assets.get(id);
    if (!a) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "资源不存在" },
      });
    }
    const { buffer: _b, ...meta } = a as Record<string, unknown>;
    return meta;
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const a = memory.assets.get(id);
    if (!a) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "资源不存在" },
      });
    }
    if (a.buffer) {
      res.setHeader("Content-Type", String(a.mime));
      res.send(a.buffer);
      return;
    }
    if (a.storageKey) {
      const obj = await getObject(String(a.storageKey));
      if (obj) {
        res.setHeader("Content-Type", String(a.mime ?? obj.mime));
        res.send(obj.buffer);
        return;
      }
    }
    throw new NotFoundException({
      error: { code: "NOT_FOUND", message: "资源字节尚未上传" },
    });
  }

  @Post(":id/upload")
  async upload(@Param("id") id: string, @Body() body: { dataBase64?: string }) {
    const a = memory.assets.get(id);
    if (!a) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "资源不存在" },
      });
    }
    if (body.dataBase64) {
      const buffer = Buffer.from(body.dataBase64, "base64");
      a.buffer = buffer;
      a.byteSize = buffer.byteLength;
      const key = String(a.storageKey);
      await putObject(key, buffer, String(a.mime));
    }
    a.uploaded = true;
    return { ok: true, assetId: id, storageKey: a.storageKey };
  }
}
