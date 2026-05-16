const userRepository = require('../repositories/userRepository');
const attendanceRepository = require('../repositories/attendanceRepository');
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
            shiftSchedule: true,
            createdAt: true,
            theme: true
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Only count up to yesterday for absences to avoid marking someone absent for a day that hasn't finished
        const pastDaysInMonth = Math.max(0, now.getDate() - 1);

        // 1. Daily Revenue (Today)
        const todaySales = await userRepository.getDailyRevenue(startOfToday);
        const todayRevenueMap = {};
        todaySales.forEach(s => todayRevenueMap[s.userId] = Number(s._sum.totalAmount || 0));

        // 2. Attendance Data
        const attendanceRecords = await attendanceRepository.getAllAttendance(startOfMonth, now);
        const workedDaysMap = {};
        const totalHoursMap = {};
        
        // Create a user map for quick lookups
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        attendanceRecords.forEach(record => {
            if (record.status === 'PRESENT') {
                const dateStr = record.date.toISOString().split('T')[0];
                if (!workedDaysMap[record.userId]) workedDaysMap[record.userId] = new Set();
                workedDaysMap[record.userId].add(dateStr);
                
                if (!totalHoursMap[record.userId]) totalHoursMap[record.userId] = 0;
                totalHoursMap[record.userId] += Number(record.totalHours || 0);
            }
        });

        return users.map(user => {
            const isCreatedThisMonth = user.createdAt >= startOfMonth;
            
            let workedDays = (workedDaysMap[user.id] && workedDaysMap[user.id].size) || 0;
            let totalMonthHours = totalHoursMap[user.id] || 0;

            let scheduledWorkingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Default
            try {
                if (user.shiftSchedule) {
                    const schedule = typeof user.shiftSchedule === 'string' ? JSON.parse(user.shiftSchedule) : user.shiftSchedule;
                    if (schedule.shiftWorkingDays) {
                        scheduledWorkingDays = schedule.shiftWorkingDays.split(',');
                    }
                }
            } catch (e) {
                console.error("Error parsing shiftSchedule for absence calculation:", e);
            }

            let effectiveDaysToCount = 0;
            const startDate = isCreatedThisMonth ? user.createdAt : startOfMonth;
            const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight today (exclude today)
            
            let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()); // Midnight of start date
            const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            while (currentDate < endDate) {
                const dayName = daysMap[currentDate.getDay()];
                if (scheduledWorkingDays.includes(dayName)) {
                    effectiveDaysToCount++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
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
                shiftSchedule: user.shiftSchedule,
                monthlySalary: (Number(user.salary || 0) * workedDays).toFixed(2),
                totalMonthHours: totalMonthHours.toFixed(2),
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

        // Real Attendance Records
        const attendanceRecords = await attendanceRepository.getAttendanceHistory(userId, startOfMonth, now);
        const workedDaysCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
        const totalMonthHours = attendanceRecords.reduce((sum, r) => sum + Number(r.totalHours || 0), 0);

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

        // --- Prepare Chart Data ---
        // 1. Session History (Last 7 days attendance)
        const sessionHistory = attendanceRecords
            .sort((a, b) => b.date - a.date)
            .slice(0, 7)
            .map(r => ({
                date: r.date.toISOString().split('T')[0],
                hours: Number(r.totalHours || 0),
                status: r.status
            }));

        // 2. Daily Sales Trend (Last 7 days revenue)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const last7DaysSales = monthlySales.filter(s => s.createdAt >= weekAgo);
        
        const dailySalesMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailySalesMap[d.toISOString().split('T')[0]] = 0;
        }

        last7DaysSales.forEach(s => {
            const dateStr = s.createdAt.toISOString().split('T')[0];
            if (dailySalesMap[dateStr] !== undefined) {
                dailySalesMap[dateStr] += Number(s.totalAmount || 0);
            }
        });

        const dailySalesTrend = Object.keys(dailySalesMap).map(dateStr => ({
            name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: dailySalesMap[dateStr]
        }));

        return {
            ...user,
            stats: {
                monthlySalary: (Number(user.salary || 0) * workedDaysCount).toFixed(2),
                workedDays: workedDaysCount,
                absences,
                totalMonthHours: totalMonthHours.toFixed(2),
                dailyRevenue: todayRevenue.toFixed(2),
                totalSalesMonth: totalSalesMonth.toFixed(2),
                lastPrime: allPrimes[0] || null,
                totalPrimesYear: totalPrimesYear.toFixed(2),
                lastSystemDistribution: lastSystemDistribution,
                sessionHistory,
                dailySalesTrend
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

    async distributeSalary(adminId, month) {
        const requester = await userRepository.findUserById(adminId);
        if (requester.role !== 'admin') {
            throw new Error('Seul un administrateur peut distribuer les salaires.');
        }

        const targetUsers = await userRepository.getAllUsersWithSelectedFields({
            id: true, username: true, salary: true
        });

        if (targetUsers.length === 0) {
            return { message: "Aucun utilisateur trouvé dans la base de données." };
        }

        const monthStr = month || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        const payments = targetUsers
            .filter(user => parseFloat(user.salary) > 0)
            .map(user => ({
                userId: user.id,
                amount: user.salary.toString(),
                month: monthStr
            }));

        if (payments.length === 0) {
            return { message: "Aucun employé avec un salaire défini." };
        }

        await userRepository.createSalaryPayments(payments);

        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        return { 
            message: `Salaires distribués avec succès à ${payments.length} employés. Total: ${totalPaid.toFixed(2)} TND pour ${monthStr}.`,
            totalPaid,
            employeeCount: payments.length
        };
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
            const verificationToken = require('crypto').randomBytes(32).toString('hex');
            updateData.email = email;
            updateData.isEmailVerified = false;
            updateData.emailVerificationToken = verificationToken;

            // Send verification email to the new address
            const emailService = require('./emailService');
            emailService.sendVerificationEmail(email, verificationToken).catch(err => {
                console.error("Failed to send verification email on update:", err);
            });
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
        const { fullName, salary, workingDays, password, shiftSchedule } = data;

        const dataToUpdate = {
            fullName,
            salary: salary !== undefined && salary !== "" ? parseFloat(salary) : 0.00,
            workingDays: workingDays || "",
            shiftSchedule: shiftSchedule !== undefined ? (typeof shiftSchedule === 'object' ? JSON.stringify(shiftSchedule) : shiftSchedule) : undefined
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
