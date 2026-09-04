import 'dotenv/config'; // populate process.env before any module (or decorator) reads it
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

// Keep the process alive if a stray async error escapes a request handler
// (a forgotten await, an upstream client that rejects late, etc). Without
// this, one unhandled rejection takes the whole API down.
const processLogger = new Logger('Process');
process.on('unhandledRejection', (reason) => {
  processLogger.error('Unhandled promise rejection', reason as Error);
});
process.on('uncaughtException', (err) => {
  processLogger.error('Uncaught exception', err);
});

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

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
