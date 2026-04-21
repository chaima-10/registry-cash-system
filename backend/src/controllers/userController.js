const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Get all users (with current month stats and today's revenue)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                salary: true,
                workingDays: true,
                createdAt: true,
                theme: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysInMonthSoFar = now.getDate();

        // 1. Daily Revenue (Today)
        const todaySales = await prisma.sale.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: startOfToday } },
            _sum: { totalAmount: true }
        });
        const todayRevenueMap = {};
        todaySales.forEach(s => todayRevenueMap[s.userId] = Number(s._sum.totalAmount || 0));

        // 2. Sales Activity (Worked Days for Cashiers)
        const sales = await prisma.sale.findMany({
            where: { createdAt: { gte: startOfMonth } },
            select: { userId: true, createdAt: true }
        });
        const salesActivityMap = {};
        sales.forEach(sale => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (!salesActivityMap[sale.userId]) salesActivityMap[sale.userId] = new Set();
            salesActivityMap[sale.userId].add(dateStr);
        });

        // 3. Login History (Worked Days for Admins)
        const loginLogs = await prisma.loginhistory.findMany({
            where: { loginAt: { gte: startOfMonth } },
            select: { userId: true, loginAt: true }
        });
        const loginActivityMap = {};
        loginLogs.forEach(log => {
            const dateStr = log.loginAt.toISOString().split('T')[0];
            if (!loginActivityMap[log.userId]) loginActivityMap[log.userId] = new Set();
            loginActivityMap[log.userId].add(dateStr);
        });

        const usersWithStats = users.map(user => {
            const isCreatedThisMonth = user.createdAt >= startOfMonth;
            
            // Determine Worked Days based on Role
            let workedDays = 0;
            if (user.role === 'admin') {
                workedDays = (loginActivityMap[user.id] && loginActivityMap[user.id].size) || 0;
            } else {
                workedDays = (salesActivityMap[user.id] && salesActivityMap[user.id].size) || 0;
            }

            // Calculate potential working days since creation (within this month)
            let effectiveDaysToCount = daysInMonthSoFar;
            if (isCreatedThisMonth) {
                const userCreationDay = user.createdAt.getDate();
                effectiveDaysToCount = (daysInMonthSoFar - userCreationDay) + 1;
            }

            const absences = Math.max(0, effectiveDaysToCount - workedDays);
            
            return {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                workingDays: user.workingDays,
                dailyRevenue: (todayRevenueMap[user.id] || 0).toFixed(2),
                workedDays,
                absences,
                monthlySalary: Number(user.salary || 0).toFixed(2),
                createdAt: user.createdAt
            };
        });

        res.json(usersWithStats);
    } catch (error) {
        console.error("Aggregation Error in getAllUsers:", error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des statistiques.',
            error: error.message 
        });
    }
};

// Get current user profile (with stats)
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                theme: true,
                createdAt: true,
                email: true,
                isEmailVerified: true,
                pendingEmail: true,
                phone: true,
                age: true,
                lastLogin: true,
                salary: true,
                workingDays: true,
                shiftSchedule: true
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Stats Logic
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysInMonthSoFar = now.getDate();

        // 1. Sales Data (this month)
        const monthlySales = await prisma.sale.findMany({
            where: {
                userId: userId,
                createdAt: { gte: startOfMonth }
            }
        });

        // 2. Daily Revenue (Today)
        const todayRevenue = monthlySales
            .filter(s => s.createdAt >= startOfToday)
            .reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // 3. Total Monthly Sales count
        const totalSalesMonth = monthlySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // 4. Worked Days Calculation
        const saleDays = new Set(monthlySales.map(s => s.createdAt.toISOString().split('T')[0]));
        
        let workedDaysCount = 0;
        if (user.role === 'admin') {
            const loginLogs = await prisma.loginhistory.findMany({
                where: {
                    userId: userId,
                    loginAt: { gte: startOfMonth }
                },
                select: { loginAt: true }
            });
            const loginDays = new Set(loginLogs.map(l => l.loginAt.toISOString().split('T')[0]));
            
            // UNION of login days and sale days for admin
            const unionDays = new Set([...saleDays, ...loginDays]);
            workedDaysCount = unionDays.size;
        } else {
            workedDaysCount = saleDays.size;
        }

        // 5. Absences
        const isCreatedThisMonth = user.createdAt >= startOfMonth;
        let effectiveDaysToCount = daysInMonthSoFar;
        if (isCreatedThisMonth) {
            const userCreationDay = user.createdAt.getDate();
            effectiveDaysToCount = (daysInMonthSoFar - userCreationDay) + 1;
        }
        const absences = Math.max(0, effectiveDaysToCount - workedDaysCount);

        // 6. Prime Logic
        const allPrimes = await prisma.prime.findMany({
            where: { userId: userId },
            orderBy: { distributedAt: 'desc' }
        });

        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const primesThisYear = allPrimes.filter(p => p.distributedAt >= startOfYear);
        const totalPrimesYear = primesThisYear.reduce((sum, p) => sum + Number(p.amount), 0);

        // For Admin, show the absolute last distribution in the system
        let lastSystemDistribution = null;
        if (user.role === 'admin') {
            lastSystemDistribution = await prisma.prime.findFirst({
                orderBy: { distributedAt: 'desc' },
                select: { amount: true, reason: true, distributedAt: true }
            });
        }

        res.json({
            ...user,
            stats: {
                monthlySalary: Number(user.salary || 0).toFixed(2),
                workedDays: workedDaysCount,
                absences,
                dailyRevenue: todayRevenue.toFixed(2),
                totalSalesMonth: totalSalesMonth.toFixed(2),
                lastPrime: allPrimes[0] || null,
                totalPrimesYear: totalPrimesYear.toFixed(2),
                lastSystemDistribution: lastSystemDistribution
            }
        });
    } catch (error) {
        console.error("getProfile Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Distribute prime to all active users
exports.distributePrime = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const adminId = req.user.id;

        // 1. Double check admin role
        const requester = await prisma.user.findUnique({ where: { id: adminId } });
        if (requester.role !== 'admin') {
            return res.status(403).json({ message: 'Seul un administrateur peut distribuer des primes.' });
        }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Veuillez saisir un montant valide.' });
        }

        // 2. Find ALL users (most inclusive)
        const targetUsers = await prisma.user.findMany({
            select: { id: true, username: true, role: true }
        });

        console.log(`[PRIME] Distributing ${amount} TND to ${targetUsers.length} users:`, targetUsers.map(u => u.username));

        if (targetUsers.length === 0) {
            return res.status(200).json({ message: "Aucun utilisateur trouvé dans la base de données." });
        }

        // 3. Create prime records for all targeted users
        const amountNum = parseFloat(amount);
        const reasonStr = reason || 'Prime exceptionnelle';

        await prisma.prime.createMany({
            data: targetUsers.map(user => ({
                userId: user.id,
                amount: amountNum,
                reason: reasonStr
            }))
        });

        res.json({ message: `Prime de ${amount} TND distribuée avec succès à ${targetUsers.length} employés.` });
    } catch (error) {
        console.error("Distribute Prime Error:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la distribution.', error: error.message });
    }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, username, theme, email, phone, age, shiftSchedule } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Validation: If username is being changed, check uniqueness
        if (username && username !== user.username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        let emailUpdateMsg = "";
        let pendingEmail = undefined;
        let verificationToken = undefined;

        // Handle Email Update with Verification
        if (email && email !== user.email) {
            // Check if email already taken by another verified user
            const existingEmailUser = await prisma.user.findFirst({
                where: {
                    email,
                    isEmailVerified: true,
                    NOT: { id: userId }
                }
            });
            if (existingEmailUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            verificationToken = crypto.randomBytes(32).toString('hex');
            pendingEmail = email;
            
            await emailService.sendVerificationEmail(email, verificationToken);
            emailUpdateMsg = " Un e-mail de confirmation a été envoyé à votre nouvelle adresse.";
        }

        const updateData = {
            fullName,
            username,
            theme,
            phone,
            age: age ? parseInt(age) : null,
            shiftSchedule
        };

        if (pendingEmail) {
            updateData.pendingEmail = pendingEmail;
            updateData.emailVerificationToken = verificationToken;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                theme: true,
                email: true,
                phone: true,
                age: true,
                shiftSchedule: true,
                isEmailVerified: true,
                pendingEmail: true
            }
        });

        res.json({ 
            message: 'Profil mis à jour avec succès.' + emailUpdateMsg, 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, salary, workingDays, password } = req.body;

        const dataToUpdate = {
            fullName,
            salary: salary !== undefined && salary !== "" ? parseFloat(salary) : 0.00,
            workingDays: workingDays || ""
        };

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(password, salt);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
        });

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is admin (prevent deleting the last admin if necessary, though role check is safer)
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (user && user.role === 'admin') {
            // Optional: Allow deleting admins only if another admin exists
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(403).json({ message: 'Cannot delete the only administrator.' });
            }
        }

        await prisma.user.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
