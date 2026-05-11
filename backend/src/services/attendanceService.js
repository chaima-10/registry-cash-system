const cron = require('node-cron');
const attendanceRepository = require('../repositories/attendanceRepository');
const userRepository = require('../repositories/userRepository');

class AttendanceService {
    constructor() {
        // Schedule the job to run every day at 00:01
        this.initializeCronJobs();
    }

    initializeCronJobs() {
        // Schedule the job to run every day at 17:00 (5:00 PM) End of Shift
        cron.schedule('0 17 * * *', async () => {
            console.log('Running daily attendance check at 17:00...');
            await this.checkTodayAttendance();
        });
    }

    async checkTodayAttendance() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            // Get all active users
            const users = await userRepository.getAllUsersSelectedFieldsOnly();

            for (const user of users) {
                // Check if an attendance record already exists for today
                const record = await attendanceRepository.getAttendanceRecord(user.id, today);

                // If no record exists by 17:00, or total hours are less than 8, mark as ABSENT
                if (!record || (record.totalHours && record.totalHours < 8)) {
                    await attendanceRepository.markAbsent(user.id, user.role, today);
                    console.log(`Marked User ${user.username} as ABSENT for ${today.toDateString()} (Worked: ${record?.totalHours || 0}h)`);
                } else {
                    console.log(`User ${user.username} was PRESENT for ${today.toDateString()} with ${record.totalHours}h`);
                }
            }
            console.log('Daily attendance check completed.');
        } catch (error) {
            console.error('Error during daily attendance check:', error);
        }
    }

    async getHistory(userId, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await attendanceRepository.getAttendanceHistory(userId, startDate, endDate);
    }

    async getAllHistory(days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const attendance = await attendanceRepository.getAllAttendance(startDate, endDate);
        const users = await userRepository.getAllUsersSelectedFieldsOnly();
        
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        return attendance
            .filter(record => userMap[record.userId])
            .map(record => ({
                ...record,
                user: userMap[record.userId]
            }));
    }

    async getTodayRecord(userId) {
        return await attendanceRepository.getAttendanceRecord(userId, new Date());
    }

    async clockIn(userId, role) {
        return await attendanceRepository.clockIn(userId, role);
    }

    async clockOut(userId) {
        return await attendanceRepository.clockOut(userId);
    }

    // Manual trigger for testing or backfilling
    async runCheckForDate(dateString) {
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const users = await userRepository.getAllUsersSelectedFieldsOnly();

        // Get all logins for the target date
        const logins = await userRepository.getLoginsSince(targetDate);
        const loggedInUserIds = new Set(
            logins
                .filter(l => new Date(l.loginAt) >= targetDate && new Date(l.loginAt) < nextDay)
                .map(l => l.userId)
        );

        let created = 0;
        for (const user of users) {
            const record = await attendanceRepository.getAttendanceRecord(user.id, targetDate);
            if (!record) {
                if (loggedInUserIds.has(user.id)) {
                    // User logged in that day but wasn't tracked yet
                    await attendanceRepository.markPresent(user.id, user.role);
                } else {
                    await attendanceRepository.markAbsent(user.id, user.role, targetDate);
                }
                created++;
            }
        }
        return { created, total: users.length };
    }
}

module.exports = new AttendanceService();
