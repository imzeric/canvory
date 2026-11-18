import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { AssistantService } from "./assistant.service.js";

@Controller("v1/assistant")
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post("materials")
  createMaterial(@Body() body: { fileId?: string; text?: string }) {
    return this.assistant.addMaterial(body.fileId ?? "", body.text ?? "");
  }

  @Post("generate")
  generate(@Body() body: { fileId?: string; demand?: string; materialIds?: string[] }) {
    return this.assistant.generate(body.fileId ?? "", body.demand ?? "", body.materialIds ?? []);
  }
}
