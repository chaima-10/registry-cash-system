const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.prime.count();
    console.log(`Prime table exists. Count: ${count}`);
    const users = await prisma.user.findMany({ select: { id: true, status: true } });
    console.log('Users status:', users);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
