import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      // The ops dashboard fires a burst of ~6 parallel queries on every page
      // load (stats, courses, trainers, payment settings, subviews…). Keeping
      // that many connections warm avoids a cold TLS handshake to the remote
      // Supabase pooler (~350ms each) on every request, which showed up as
      // identical ~475ms latencies across unrelated endpoints.
      min: 10,
      idleTimeoutMillis: 300_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 30_000,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    // Force the pg pool to open a real TCP connection now rather than on the
    // first inbound request, which would stall it for several seconds.
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
