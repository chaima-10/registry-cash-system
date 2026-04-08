const prisma = require('./src/config/prisma');

async function test() {
    try {
        console.log("Testing Prisma connection...");
        const users = await prisma.user.findMany();
        console.log(`Users found: ${users.length}`);
        
        const products = await prisma.product.findMany({
            include: { category: true, subcategory: true }
        });
        console.log(`Products found: ${products.length}`);
        if (products.length > 0) {
            console.log("Sample product:", products[0].name);
        }

        const sales = await prisma.sale.findMany();
        console.log(`Sales found: ${sales.length}`);

    } catch (err) {
        console.error("PRISMA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
