const userRepository = require('../repositories/userRepository');
const uploadService = require('../services/uploadService');
const bcrypt = require('bcryptjs');

class UserService {
    async getAllUsersStats() {
        const users = await userRepository.getAllUsersWithSelectedFields({
            id: true,
            username: true,
            fullName: true,
            role: true,
            salary: true,
            workingDays: true,
            createdAt: true,
            theme: true
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysInMonthSoFar = now.getDate();

        // 1. Daily Revenue (Today)
        const todaySales = await userRepository.getDailyRevenue(startOfToday);
        const todayRevenueMap = {};
        todaySales.forEach(s => todayRevenueMap[s.userId] = Number(s._sum.totalAmount || 0));

        // 2. Sales Activity (Worked Days for Cashiers)
        const sales = await userRepository.getSalesSince(startOfMonth);
        const salesActivityMap = {};
        sales.forEach(sale => {
            const dateStr = sale.createdAt.toISOString().split('T')[0];
            if (!salesActivityMap[sale.userId]) salesActivityMap[sale.userId] = new Set();
            salesActivityMap[sale.userId].add(dateStr);
        });

        // 3. Login History (Worked Days for Admins)
        const loginLogs = await userRepository.getLoginsSince(startOfMonth);
        const loginActivityMap = {};
        loginLogs.forEach(log => {
            const dateStr = log.loginAt.toISOString().split('T')[0];
            if (!loginActivityMap[log.userId]) loginActivityMap[log.userId] = new Set();
            loginActivityMap[log.userId].add(dateStr);
        });

        return users.map(user => {
            const isCreatedThisMonth = user.createdAt >= startOfMonth;
            
            let workedDays = 0;
            if (user.role === 'admin') {
                workedDays = (loginActivityMap[user.id] && loginActivityMap[user.id].size) || 0;
            } else {
                workedDays = (salesActivityMap[user.id] && salesActivityMap[user.id].size) || 0;
            }

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
                salary: user.salary,
                monthlySalary: (Number(user.salary || 0) * workedDays).toFixed(2),
                createdAt: user.createdAt
            };
        });
    }

    async getProfileWithStats(userId) {
        const user = await userRepository.findUserByIdWithSelectedFields(userId, {
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
        });

        if (!user) {
            throw new Error('User not found');
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysInMonthSoFar = now.getDate();

        const monthlySales = await userRepository.getMonthlySales(userId, startOfMonth);

        const todayRevenue = monthlySales
            .filter(s => s.createdAt >= startOfToday)
            .reduce((sum, s) => sum + Number(s.totalAmount), 0);

        const totalSalesMonth = monthlySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        const saleDays = new Set(monthlySales.map(s => s.createdAt.toISOString().split('T')[0]));
        
        let workedDaysCount = 0;
        if (user.role === 'admin') {
            const loginLogs = await userRepository.getMonthlyLoginHistory(userId, startOfMonth);
            const loginDays = new Set(loginLogs.map(l => l.loginAt.toISOString().split('T')[0]));
            
            const unionDays = new Set([...saleDays, ...loginDays]);
            workedDaysCount = unionDays.size;
        } else {
            workedDaysCount = saleDays.size;
        }

        const isCreatedThisMonth = user.createdAt >= startOfMonth;
        let effectiveDaysToCount = daysInMonthSoFar;
        if (isCreatedThisMonth) {
            const userCreationDay = user.createdAt.getDate();
            effectiveDaysToCount = (daysInMonthSoFar - userCreationDay) + 1;
        }
        const absences = Math.max(0, effectiveDaysToCount - workedDaysCount);

        const allPrimes = await userRepository.getAllPrimes(userId);

        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const primesThisYear = allPrimes.filter(p => p.distributedAt >= startOfYear);
        const totalPrimesYear = primesThisYear.reduce((sum, p) => sum + Number(p.amount), 0);

        let lastSystemDistribution = null;
        if (user.role === 'admin') {
            lastSystemDistribution = await userRepository.getLastSystemDistribution();
        }

        return {
            ...user,
            stats: {
                monthlySalary: (Number(user.salary || 0) * workedDaysCount).toFixed(2),
                workedDays: workedDaysCount,
                absences,
                dailyRevenue: todayRevenue.toFixed(2),
                totalSalesMonth: totalSalesMonth.toFixed(2),
                lastPrime: allPrimes[0] || null,
                totalPrimesYear: totalPrimesYear.toFixed(2),
                lastSystemDistribution: lastSystemDistribution
            }
        };
    }

    async distributePrime(adminId, amount, reason) {
        const requester = await userRepository.findUserById(adminId);
        if (requester.role !== 'admin') {
            throw new Error('Seul un administrateur peut distribuer des primes.');
        }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            throw new Error('Veuillez saisir un montant valide.');
        }

        const targetUsers = await userRepository.getAllUsersSelectedFieldsOnly();

        console.log(`[PRIME] Distributing ${amount} TND to ${targetUsers.length} users:`, targetUsers.map(u => u.username));

        if (targetUsers.length === 0) {
            return { message: "Aucun utilisateur trouvé dans la base de données." };
        }

        const amountNum = parseFloat(amount);
        const reasonStr = reason || 'Prime exceptionnelle';

        await userRepository.createPrimes(
            targetUsers.map(user => ({
                userId: user.id,
                amount: amountNum.toString(),
                reason: reasonStr
            }))
        );

        return { message: `Prime de ${amount} TND distribuée avec succès à ${targetUsers.length} employés.` };
    }

    async updateProfile(userId, data, file) {
        const { fullName, username, theme, email, phone, age, shiftSchedule } = data;

        const user = await userRepository.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (username && username !== user.username) {
            const existingUser = await userRepository.findUserByUsernameNotId(username, userId);
            if (existingUser) {
                throw new Error('Username already taken');
            }
        }

        if (email && email !== user.email) {
            const existingEmailUser = await userRepository.findUserByEmailNotId(email, userId);
            if (existingEmailUser) {
                throw new Error('Email already in use');
            }
        }

        const updateData = {
            fullName: fullName !== undefined ? fullName : user.fullName,
            username: username !== undefined ? username : user.username,
            theme: theme !== undefined ? theme : user.theme,
            phone: phone !== undefined ? phone : user.phone,
            age: (age !== undefined && age !== '') ? parseInt(age) : (age === '' ? null : user.age),
            shiftSchedule: shiftSchedule !== undefined ? shiftSchedule : user.shiftSchedule
        };
        
        if (email && email !== user.email) {
            updateData.email = email;
            updateData.isEmailVerified = true;
        }

        if (data.removeProfilePicture === 'true') {
            updateData.profilePicture = null;
        } else if (file) {
            updateData.profilePicture = await uploadService.uploadImage(file, 'profiles');
        }

        return await userRepository.updateUserWithSelectedFields(userId, updateData, {
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
        });
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await userRepository.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new Error('Incorrect current password');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await userRepository.updateUser(userId, { password: hashedPassword });
    }

    async updateUser(id, data) {
        const { fullName, salary, workingDays, password } = data;

        const dataToUpdate = {
            fullName,
            salary: salary !== undefined && salary !== "" ? parseFloat(salary) : 0.00,
            workingDays: workingDays || ""
        };

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(password, salt);
        }

        return await userRepository.updateUser(id, dataToUpdate);
    }

    async deleteUser(id) {
        const user = await userRepository.findUserById(id);
        if (user && user.role === 'admin') {
            const adminCount = await userRepository.countAdmins();
            if (adminCount <= 1) {
                throw new Error('Cannot delete the only administrator.');
            }
        }

        await userRepository.deleteUser(id);
    }
}

module.exports = new UserService();
