import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow requests from the Ionic app (browser and device).
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
