import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/auth.decorator.js";
import type { AuthUser } from "../auth/auth.guard.js";
import { DocumentsService } from "./documents.service.js";

@Controller("v1/documents")
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { title?: string; cdm?: unknown },
  ) {
    return this.docs.create(user, body.title ?? "Untitled", body.cdm);
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.docs.get(id, user);
  }

  @Patch(":id")
  async patch(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { cdm: unknown },
  ) {
    return this.docs.patch(id, user, body.cdm);
  }

  @Post(":id/versions")
  async saveVersion(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content: unknown; label?: string },
  ) {
    return this.docs.putVersion(id, user, body.content, body.label);
  }

  @Get(":id/versions")
  async versions(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return { items: await this.docs.listVersions(id, user) };
  }

  @Post(":id/restore")
  async restore(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { version: number },
  ) {
    return this.docs.restore(id, body.version, user);
  }
}
