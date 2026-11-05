import './env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: the WhatsApp webhook checks Meta's signature against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Allow requests from the Ionic app (browser and device).
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
