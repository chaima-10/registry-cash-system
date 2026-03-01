const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findUnique({
            where: { username: 'admin' }
        });
        if (user) {
            console.log('Admin user found:');
            console.log('  ID:', user.id);
            console.log('  Username:', user.username);
            console.log('  Role:', user.role);
            console.log('  Password (hashed):', user.password);
        } else {
            console.log('Admin user NOT found.');
        }
    } catch (e) {
        console.error('Error checking user:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
