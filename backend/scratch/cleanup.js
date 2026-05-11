const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
    try {
        console.log("Cleaning up orphan attendance records...");
        const result = await prisma.$executeRaw`DELETE FROM Attendance WHERE userId NOT IN (SELECT id FROM User)`;
        console.log(`Deleted ${result} orphan attendance records.`);
        
        console.log("Cleaning up orphan prime records...");
        const result2 = await prisma.$executeRaw`DELETE FROM Prime WHERE userId NOT IN (SELECT id FROM User)`;
        console.log(`Deleted ${result2} orphan prime records.`);

        console.log("Cleaning up orphan loginhistory records...");
        const result3 = await prisma.$executeRaw`DELETE FROM LoginHistory WHERE userId NOT IN (SELECT id FROM User)`;
        console.log(`Deleted ${result3} orphan loginhistory records.`);
        
        console.log("Cleaning up orphan sale records...");
        const result4 = await prisma.$executeRaw`DELETE FROM Sale WHERE userId NOT IN (SELECT id FROM User)`;
        console.log(`Deleted ${result4} orphan sale records.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

clean();
