const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    try {
        console.log('Checking database connection...');
        const userCount = await prisma.user.count();
        const productCount = await prisma.product.count();
        const categoryCount = await prisma.category.count();

        console.log(`Users: ${userCount}`);
        console.log(`Products: ${productCount}`);
        console.log(`Categories: ${categoryCount}`);

        if (productCount > 0) {
            const firstProduct = await prisma.product.findFirst({
                include: { category: true, subcategory: true }
            });
            console.log('First Product Sample:', JSON.stringify(firstProduct, null, 2));
        } else {
            console.log('No products found in the database.');
        }

    } catch (error) {
        console.error('Database Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
