import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DocumentsController } from "./documents/documents.controller.js";
import { DocumentsService } from "./documents/documents.service.js";
import { VersionsService } from "./documents/versions.service.js";
import { AssetsController } from "./assets/assets.controller.js";
import { PreflightController } from "./export/preflight.controller.js";
import { TasksController } from "./export/tasks.controller.js";
import { TasksService } from "./export/tasks.service.js";
import { AuthGuard } from "./auth/auth.guard.js";
import { AssistantController } from "./assistant/assistant.controller.js";
import { AssistantService } from "./assistant/assistant.service.js";

@Module({
  controllers: [
    HealthController,
    DocumentsController,
    AssetsController,
    PreflightController,
    TasksController,
    AssistantController,
  ],
  providers: [DocumentsService, VersionsService, TasksService, AuthGuard, AssistantService],
})
export class AppModule {}

