const prisma = require('../config/prisma');

class SalaryRepository {
    async createSalaryPayment(data, attendanceIds) {
        return await prisma.$transaction(async (tx) => {
            // 1. Create the salary payment record
            const payment = await tx.salarypayment.create({
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });

            // 2. Mark attendance records as paid and link them
            if (attendanceIds && attendanceIds.length > 0) {
                await tx.attendance.updateMany({
                    where: {
                        id: { in: attendanceIds }
                    },
                    data: {
                        isPaid: true,
                        salaryPaymentId: payment.id,
                        updatedAt: new Date()
                    }
                });
            }

            return payment;
        });
    }

    async getSalaryHistory() {
        return await prisma.salarypayment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                paidAt: 'desc'
            }
        });
    }

    async getSalaryDetails(paymentId) {
        return await prisma.salarypayment.findUnique({
            where: { id: parseInt(paymentId) },
            include: {
                user: true,
                attendances: true
            }
        });
    }

    async getUnpaidAttendance(userId, startOfMonth, now) {
        return await prisma.attendance.findMany({
            where: {
                userId: parseInt(userId),
                status: 'PRESENT',
                isPaid: false,
                date: {
                    gte: startOfMonth,
                    lte: now
                }
            }
        });
    }
}

module.exports = new SalaryRepository();
