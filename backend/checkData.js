const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const userCount = await prisma.user.count();
        const productCount = await prisma.product.count();
        const saleCount = await prisma.sale.count();
        const categoryCount = await prisma.category.count();

        console.log({
            userCount,
            productCount,
            saleCount,
            categoryCount
        });
    } catch (e) {
        console.error("Data Check Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
