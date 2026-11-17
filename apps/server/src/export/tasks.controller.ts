import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/auth.decorator.js";
import type { AuthUser } from "../auth/auth.guard.js";
import { TasksService } from "./tasks.service.js";
import { createTaskBodySchema } from "./dto.js";

@Controller("v1/export/tasks")
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createTaskBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: "VALIDATION_ERROR",
          message: "mode 必须为 auto|editable|fidelity",
          details: parsed.error.flatten(),
        },
      });
    }
    return this.tasks.create(user, parsed.data);
  }

  @Get(":taskId")
  async get(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.tasks.get(taskId, user);
  }

  @Post(":taskId/cancel")
  async cancel(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.tasks.cancel(taskId, user);
  }

  @Post(":taskId/retry")
  @HttpCode(201)
  retry(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.tasks.retry(taskId, user);
  }

  @Get(":taskId/artifact")
  async artifact(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const file = await this.tasks.artifact(taskId, user);
    res.setHeader("Content-Type", file.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.buffer);
  }
}
