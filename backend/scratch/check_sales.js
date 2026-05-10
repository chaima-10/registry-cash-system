const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sales = await prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
    });
    console.log(JSON.stringify(sales, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
