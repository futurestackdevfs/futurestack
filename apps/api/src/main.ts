import 'dotenv/config'; // populate process.env before any module (or decorator) reads it
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

const processLogger = new Logger('Process');

// A rejected promise nobody awaited is bad but usually not corrupting — log it
// loudly and keep serving. (Track these down; each one is a latent bug.)
process.on('unhandledRejection', (reason) => {
  processLogger.error('Unhandled promise rejection', reason as Error);
});

// An uncaught exception leaves the process in an unknown state (half-open
// handles, partially-applied mutations). Node's own guidance is to log and
// exit — the platform (Render) restarts us with a clean slate. Staying alive
// here risks serving corrupt data.
process.on('uncaughtException', (err) => {
  processLogger.error('Uncaught exception — exiting for a clean restart', err);
  process.exit(1);
});

async function bootstrap() {
  // rawBody: true keeps the untouched request body available via req.rawBody for
  // signature verification (Razorpay webhook) while still parsing JSON on every
  // other route normally.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Behind Render's load balancer + the Next BFF proxy — trust X-Forwarded-For
  // so req.ip is the real client, not the immediate peer (used by audit logs).
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set(
    'trust proxy',
    true,
  );
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // In production FRONTEND_URL is mandatory (enforced by validateEnv) — never
  // silently fall back to a localhost origin on a misconfigured prod deploy.
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL must be set in production');
  }
  const allowedOrigins = frontendUrl
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
