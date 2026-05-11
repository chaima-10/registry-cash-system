const prisma = require('../config/prisma');

class AttendanceRepository {
    async clockIn(userId, role) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of day in local time
        const isLate = (now.getHours() > 9) || (now.getHours() === 9 && now.getMinutes() > 0);
        const currentStatus = isLate ? 'LATE' : 'PRESENT';

        try {
            return await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: parseInt(userId),
                        date: today
                    }
                },
                update: {
                    status: currentStatus,
                    clockIn: now,
                    role
                },
                create: {
                    userId: parseInt(userId),
                    role,
                    date: today,
                    status: currentStatus,
                    clockIn: now
                }
            });
        } catch (error) {
            console.error('Error in clockIn:', error);
            // If upsert fails, try a more robust approach
            if (error.code === 'P2002') {
                // Try to find any record for this user today and update it
                const anyRecord = await prisma.attendance.findFirst({
                    where: {
                        userId: parseInt(userId),
                        date: {
                            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                        }
                    }
                });
                
                if (anyRecord) {
                    return await prisma.attendance.update({
                        where: { id: anyRecord.id },
                        data: {
                            status: currentStatus,
                            clockIn: now,
                            role
                        }
                    });
                }
            }
            throw error;
        }
    }

    async clockOut(userId) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
            console.error('Error in markPresent:', error);
            if (error.code === 'P2002') {
                const anyRecord = await prisma.attendance.findFirst({
                    where: {
                        userId: parseInt(userId),
                        date: {
                            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                        }
                    }
                });
                
                if (anyRecord) {
                    return await prisma.attendance.update({
                        where: { id: anyRecord.id },
                        data: {
                            status: 'PRESENT',
                            role
                        }
                    });
                }
            }
            throw error;
        }
    }

    async markAbsent(userId, role, date) {
        const d = new Date(date);
        const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

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
            console.error('Error in markAbsent:', error);
            if (error.code === 'P2002') {
                const anyRecord = await prisma.attendance.findFirst({
                    where: {
                        userId: parseInt(userId),
                        date: {
                            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                            lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
                        }
                    }
                });
                
                if (anyRecord) {
                    return await prisma.attendance.update({
                        where: { id: anyRecord.id },
                        data: {
                            status: 'ABSENT'
                        }
                    });
                }
            }
            throw error;
        }
    }

    async getAttendanceRecord(userId, date) {
        const d = new Date(date);
        const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

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
