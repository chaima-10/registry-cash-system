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

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password match: ${isMatch}`);

        if (isMatch) {
            console.log('Attempting to update lastLogin and loginHistory...');
            await prisma.user.update({
                where: { id: user.id },
                data: { 
                    lastLogin: new Date(),
                    loginHistory: {
                        create: {}
                    }
                }
            });
            console.log('✅ UPDATE SUCCESS');
            console.log('✅ LOGIN SUCCESS SIMULATED');
        } else {
            console.log('❌ LOGIN FAILED: Password mismatch');
        }
    } catch (error) {
        console.error('❌ ERROR during simulation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin('admin', 'admin');
