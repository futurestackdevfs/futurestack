import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.projectOrder.groupBy({ by: ['status'], _count: { _all: true } });
console.log(JSON.stringify(r, null, 2));
await p.$disconnect();
