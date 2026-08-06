import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Seeds the singleton PaymentSettings row.
 *
 * Idempotent: if a row already exists it is left untouched (it may have been
 * changed by an admin), otherwise it is created with the launch defaults.
 *
 * Launch defaults (see the admin Payment Settings panel):
 *   - domestic (INR)  = on
 *   - international (USD) = off
 *
 * Run with: pnpm db:seed --filter api
 */
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const existing = await prisma.paymentSettings.findFirst();

  if (existing) {
    console.log('PaymentSettings row exists (id=%s) — skipped.', existing.id);
  } else {
    await prisma.paymentSettings.create({
      data: { domesticEnabled: true, internationalEnabled: false },
    });
    console.log('PaymentSettings seeded: INR=on, USD=off.');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});