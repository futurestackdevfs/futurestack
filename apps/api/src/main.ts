import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  // rawBody: true keeps the untouched request body available via req.rawBody for
  // signature verification (Razorpay webhook) while still parsing JSON on every
  // other route normally.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.use('/uploads', express.static(join(__dirname, '../public/uploads')));

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
