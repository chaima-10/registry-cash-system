const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

// Get all users (with current month stats)
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

        // Current Month Statistics
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonthSoFar = now.getDate();

        // Fetch unique days with sales for each user this month
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startOfMonth }
            },
            select: {
                userId: true,
                createdAt: true
            }
        });

        // Group by user and unique day
        const activityMap = {};
        sales.forEach(sale => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (!activityMap[sale.userId]) activityMap[sale.userId] = new Set();
            activityMap[sale.userId].add(dateStr);
        });

        const usersWithStats = users.map(user => {
            const workedDaysCount = activityMap[user.id] ? activityMap[user.id].size : 0;
            const absencesCount = Math.max(0, daysInMonthSoFar - workedDaysCount);
            
            // monthlySalary = dailyRate (user.salary) * workedDays
            const dailyRate = parseFloat(user.salary || 0);
            const monthlySalary = workedDaysCount * dailyRate;

            return {
                ...user,
                workedDays: workedDaysCount, // Overwrite/Add field
                absences: absencesCount,
                monthlySalary: monthlySalary.toFixed(2)
            };
        });

        res.json(usersWithStats);
    } catch (error) {
        console.error('Error fetching users with stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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
                createdAt: true
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

        // Validation: If username is being changed, check uniqueness
        if (username) {
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

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                fullName,
                username,
                theme,
                email,
                phone
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                theme: true,
                email: true,
                phone: true
            }
        });

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
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
