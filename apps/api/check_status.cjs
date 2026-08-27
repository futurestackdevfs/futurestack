const { PrismaClient } = require('@prisma/client');
async function main() {
  const p = new PrismaClient();
  const r = await p.projectOrder.groupBy({ by: ['status'], _count: { _all: true } });
  r.forEach(x => console.log(x.status, '-', x._count._all, 'rows'));
  await p['$disconnect']();
}
main().catch(console.error);
