import { NestFactory } from '@nestjs/core';
<<<<<<< HEAD
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
=======
>>>>>>> 6e97d375bd37f084083c28b8923d2bc07267d32d
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

<<<<<<< HEAD
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  app.use('/uploads', express.static(join(__dirname, '../public/uploads')));

=======
>>>>>>> 6e97d375bd37f084083c28b8923d2bc07267d32d
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
