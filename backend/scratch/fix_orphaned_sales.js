const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for orphaned sales...');
    const sales = await prisma.sale.findMany();
    const users = await prisma.user.findMany({ select: { id: true } });
    const userIds = new Set(users.map(u => u.id));

    const orphanedSales = sales.filter(s => !userIds.has(s.userId));

    if (orphanedSales.length > 0) {
        console.log(`Found ${orphanedSales.length} orphaned sales.`);
        console.log(orphanedSales.map(s => s.id));
        
        // Uncomment to delete
        const deleted = await prisma.sale.deleteMany({
            where: {
                id: { in: orphanedSales.map(s => s.id) }
            }
        });
        console.log(`Deleted ${deleted.count} orphaned sales.`);
    } else {
        console.log('No orphaned sales found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
