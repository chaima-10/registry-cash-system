const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGetAllUsers() {
    try {
        console.log("Fetching users...");
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users.`);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        console.log("Fetching sales for month starting:", startOfMonth.toISOString());
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startOfMonth }
            },
            select: {
                userId: true,
                createdAt: true
            }
        });
        console.log(`Found ${sales.length} sales.`);

        const activityMap = {};
        sales.forEach(sale => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (!activityMap[sale.userId]) activityMap[sale.userId] = new Set();
            activityMap[sale.userId].add(dateStr);
        });

        const usersWithStats = users.map(user => {
            const workedDaysCount = activityMap[user.id] ? activityMap[user.id].size : 0;
            return { id: user.id, username: user.username, workedDaysCount };
        });

        console.log("Success! Users with stats:", JSON.stringify(usersWithStats, null, 2));
    } catch (error) {
        console.error("Aggregation Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testGetAllUsers();
