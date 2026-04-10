const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const cols = await prisma.$queryRaw`DESCRIBE Product`;
    console.log('Product Columns:', JSON.stringify(cols, null, 2));
  } catch (e) {
    console.error('Error checking Cart:', e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
