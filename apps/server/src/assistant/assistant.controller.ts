import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthUser } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/auth.decorator.js";
import { AssistantService } from "./assistant.service.js";

@Controller("v1/assistant")
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post("materials")
  createMaterial(
    @CurrentUser() user: AuthUser,
    @Body() body: { fileId?: string; text?: string; mime?: string; url?: string; path?: string },
  ) {
    return this.assistant.addMaterial(user, body.fileId ?? "", body.text ?? "", body.mime ?? "text/plain", {
      url: body.url,
      path: body.path,
    });
  }

  @Get("materials/:fileId/:id")
  readMaterial(@CurrentUser() user: AuthUser, @Param("fileId") fileId: string, @Param("id") id: string) {
    return this.assistant.readOwnedMaterial(user, fileId, id);
  }

  @Post("generate")
  generate(
    @CurrentUser() user: AuthUser,
    @Body() body: { fileId?: string; demand?: string; materialIds?: string[] },
  ) {
    return this.assistant.generate(user, body.fileId ?? "", body.demand ?? "", body.materialIds ?? []);
  }
}
