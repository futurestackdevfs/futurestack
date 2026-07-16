import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Need dotenv if DATABASE_URL is not set
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { course: { trainerId: { not: null } } },
    include: { course: true }
  });

  let sql = '-- Seed Revenue Ledger Data\n\n';
  const trainerIds = new Set<string>();

  for (const e of enrollments) {
    const amount = e.amountPaid;
    const cut = amount * 0.5;
    const trainerId = e.course.trainerId!;
    trainerIds.add(trainerId);

    sql += `INSERT INTO "RevenueLedger" (id, "trainerId", "enrollmentId", gross, "platformCut", "trainerShare", "createdAt")\n`;
    sql += `VALUES (gen_random_uuid(), '${trainerId}', '${e.id}', ${amount}, ${cut}, ${cut}, now());\n\n`;
  }

  sql += '-- Seed Payout Data\n\n';
  for (const tId of trainerIds) {
    sql += `INSERT INTO "Payout" (id, "trainerId", amount, period, status, "createdAt")\n`;
    sql += `VALUES (gen_random_uuid(), '${tId}', 1000, 'July 2026', 'PENDING', now());\n\n`;
    break; // Just one as requested
  }

  const outPath = path.join('C:\\Users\\deshm\\.gemini\\antigravity\\brain\\f21d2a18-07ca-4db0-bf53-f5b4a475c53a', 'scratch', 'seed_data.sql');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sql);
  console.log('Seed generated at ' + outPath);
}

main().catch(console.error).finally(() => prisma.$disconnect());
