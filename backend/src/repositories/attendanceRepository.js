const prisma = require('../config/prisma');

class AttendanceRepository {
    async clockIn(userId, role) {
        const now = new Date();
        const today = new Date(now.toISOString().split('T')[0]); // Start of day in UTC

        try {
            return await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: parseInt(userId),
                        date: today
                    }
                },
                update: {
                    status: 'PRESENT',
                    clockIn: now,
                    role
                },
                create: {
                    userId: parseInt(userId),
                    role,
                    date: today,
                    status: 'PRESENT',
                    clockIn: now
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return await prisma.attendance.update({
                    where: { userId_date: { userId: parseInt(userId), date: today } },
                    data: { status: 'PRESENT', clockIn: now }
                });
            }
            throw error;
        }
    }

    async clockOut(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const record = await this.getAttendanceRecord(userId, today);
        if (!record || !record.clockIn) {
            throw new Error('No active shift found to clock out of.');
        }

        const clockOutTime = new Date();
        const diffMs = clockOutTime - new Date(record.clockIn);
        const diffHrs = diffMs / (1000 * 60 * 60);

        return await prisma.attendance.update({
            where: {
                userId_date: {
                    userId,
                    date: today
                }
            },
            data: {
                clockOut: clockOutTime,
                totalHours: diffHrs
            }
        });
    }

    async markPresent(userId, role) {
        const now = new Date();
        const today = new Date(now.toISOString().split('T')[0]);

        try {
            return await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: parseInt(userId),
                        date: today
                    }
                },
                update: {
                    status: 'PRESENT',
                    role
                },
                create: {
                    userId: parseInt(userId),
                    role,
                    date: today,
                    status: 'PRESENT'
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return await prisma.attendance.update({
                    where: { userId_date: { userId: parseInt(userId), date: today } },
                    data: { status: 'PRESENT', role }
                });
            }
            throw error;
        }
    }

    async markAbsent(userId, role, date) {
        const d = new Date(date);
        const targetDate = new Date(d.toISOString().split('T')[0]);

        try {
            return await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: parseInt(userId),
                        date: targetDate
                    }
                },
                update: {
                    status: 'ABSENT'
                },
                create: {
                    userId: parseInt(userId),
                    role,
                    date: targetDate,
                    status: 'ABSENT'
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return await prisma.attendance.update({
                    where: { userId_date: { userId: parseInt(userId), date: targetDate } },
                    data: { status: 'ABSENT' }
                });
            }
            throw error;
        }
    }

    async getAttendanceRecord(userId, date) {
        const d = new Date(date);
        const targetDate = new Date(d.toISOString().split('T')[0]);

        return await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: parseInt(userId),
                    date: targetDate
                }
            }
        });
    }

    async getAttendanceHistory(userId, startDate, endDate) {
        return await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
    }

    async getAllAttendance(startDate, endDate) {
        return await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: [
                { date: 'desc' }
            ]
        });
    }
}

module.exports = new AttendanceRepository();
