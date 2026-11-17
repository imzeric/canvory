import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { TasksService } from "./tasks.service.js";
import { preflightBodySchema } from "./dto.js";

@Controller("v1/export")
@UseGuards(AuthGuard)
export class PreflightController {
  constructor(private readonly tasks: TasksService) {}

  @Post("preflight")
  @HttpCode(200)
  preflight(@Body() body: unknown) {
    const parsed = preflightBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: "VALIDATION_ERROR",
          message: "mode 必须为 auto|editable|fidelity",
          details: parsed.error.flatten(),
        },
      });
    }
    return this.tasks.runPreflight({
      document: parsed.data.document,
      mode: parsed.data.mode,
      scope: parsed.data.scope,
    });
  }
}
