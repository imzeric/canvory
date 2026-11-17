import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  process.env.USE_MEMORY_DB ??= "1";
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Canvory server listening on :${port} (prefix /api)`);
}

bootstrap();
