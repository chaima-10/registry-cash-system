const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const giveaways = await prisma.giveaway.findMany();
  console.log('Giveaways in DB:', giveaways);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
