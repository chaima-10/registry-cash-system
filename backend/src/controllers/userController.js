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

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
                lastLogin: true
            }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, username, theme, email, phone } = req.body;
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
            phone
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
