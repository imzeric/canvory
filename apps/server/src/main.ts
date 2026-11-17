import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  // 未配置数据库时才回退内存。配置了 DATABASE_URL 则走 Postgres，除非显式 USE_MEMORY_DB=1。
  if (!process.env.DATABASE_URL) {
    process.env.USE_MEMORY_DB ??= "1";
  }
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger("Bootstrap").log(`Canvory server listening on :${port} (prefix /api)`);
}

bootstrap();
