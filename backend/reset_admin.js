const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
    const hash = await bcrypt.hash('admin', 10);
    const user = await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: hash },
        create: {
            username: 'admin',
            password: hash,
            role: 'admin'
        }
    });
    console.log('✅ Admin user created/updated successfully!');
    console.log('   Username:', user.username);
    console.log('   Role:', user.role);
    console.log('\nYou can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    await prisma.$disconnect();
}

reset().catch(async e => {
    console.error('❌ Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
