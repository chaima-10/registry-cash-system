const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin', salt);

    await prisma.user.update({
        where: { id: 1 },
        data: { password: hashedPassword, username: 'admin' }
    });
    console.log('Admin password reset to: admin');
    await prisma.$disconnect();
}

reset().catch(console.error);
