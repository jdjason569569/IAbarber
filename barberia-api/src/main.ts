import './env.js';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: the WhatsApp webhook checks Meta's signature against the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // The haircut advisor sends the client's photo as base64 (a few hundred KB); the default limit is 100 KB.
  app.useBodyParser('json', { limit: '5mb' });
  // Allow requests from the Ionic app (browser and device).
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
