const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const password = 'admin'; // Default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            fullName: 'System Administrator',
            salary: 0,
            workingDays: 'All',
        },
    });

    console.log('Admin user seeded:', admin);

    // Seed Categories
    const drinks = await prisma.category.upsert({
        where: { name: 'Drinks' },
        update: {},
        create: { name: 'Drinks' },
    });

    const snacks = await prisma.category.upsert({
        where: { name: 'Snacks' },
        update: {},
        create: { name: 'Snacks' },
    });

    console.log('Categories seeded');

    // Seed Products
    // Check if products exist to avoid duplicates if running multiple times (upsert needs unique where)
    // Using barcode as unique key
    const products = [
        { name: 'Cola 330ml', barcode: '111111', price: 1.50, stockQuantity: 100, categoryId: drinks.id },
        { name: 'Water 500ml', barcode: '222222', price: 0.50, stockQuantity: 200, categoryId: drinks.id },
        { name: 'Chips', barcode: '333333', price: 2.00, stockQuantity: 50, categoryId: snacks.id },
        { name: 'Chocolate Bar', barcode: '444444', price: 1.20, stockQuantity: 80, categoryId: snacks.id },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { barcode: p.barcode },
            update: {},
            create: p,
        });
    }

    console.log('Products seeded');
    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
