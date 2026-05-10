require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testLogin(identifier, password) {
    console.log(`\n--- Testing login for: "${identifier}" ---`);

    // Try finding user by username
    let user = await prisma.user.findUnique({ where: { username: identifier } });
    if (!user) {
        user = await prisma.user.findFirst({ where: { email: identifier } });
        console.log('Looked up by email');
    } else {
        console.log('Looked up by username');
    }

    if (!user) {
        console.log('FAIL: User not found in DB');
        return;
    }

    console.log(`Found user: id=${user.id}, username="${user.username}", role="${user.role}"`);
    console.log(`Stored hash: ${user.password}`);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match: ${isMatch}`);

    if (!isMatch) {
        console.log('FAIL: Password mismatch');
        // Try trimmed
        const isMatchTrimmed = await bcrypt.compare(password.trim(), user.password);
        console.log(`Password match (trimmed): ${isMatchTrimmed}`);
    } else {
        console.log('SUCCESS: Login would succeed');
    }
}

async function main() {
    // Test with admin / admin (default seed password)
    await testLogin('admin', 'admin');
    // Also test with what user might be typing
    await testLogin('admin', '12345');
}

main()
    .catch(e => console.error('Error:', e))
    .finally(async () => await prisma.$disconnect());
