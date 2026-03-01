const prisma = require('./src/config/prisma');
const bcrypt = require('bcryptjs');

async function testLogin(username, password) {
    console.log(`Testing login for: ${username}`);
    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            console.log('❌ User not found in database.');
            return;
        }

        console.log('User found:', {
            id: user.id,
            username: user.username,
            role: user.role,
            passwordHash: user.password
        });

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password match: ${isMatch}`);

        if (isMatch) {
            console.log('✅ LOGIN SUCCESS SIMULATED');
        } else {
            console.log('❌ LOGIN FAILED: Password mismatch');
        }
    } catch (error) {
        console.error('❌ ERROR during simulation:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ensure we use the exact same values as the user reported
testLogin('admin', 'admin');
