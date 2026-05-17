const prisma = require('../config/prisma');

class UserRepository {
    async findUserByUsername(username) {
        return await prisma.user.findUnique({ where: { username } });
    }

    async findUserByEmail(email) {
        return await prisma.user.findFirst({ where: { email } });
    }

    async findUserById(id) {
        return await prisma.user.findUnique({ where: { id } });
    }

    async findUserByVerificationToken(token) {
        return await prisma.user.findFirst({ where: { emailVerificationToken: token } });
    }

    async findUserByResetToken(token) {
        return await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gte: new Date() }
            }
        });
    }

    async findUserByIdWithSelectedFields(id, selectFields) {
        return await prisma.user.findUnique({ where: { id }, select: selectFields });
    }

    async findUserByEmailNotId(email, excludeId) {
        return await prisma.user.findFirst({
            where: {
                email,
                NOT: { id: excludeId }
            }
        });
    }

    async findUserByUsernameNotId(username, excludeId) {
        return await prisma.user.findFirst({
            where: {
                username,
                NOT: { id: excludeId }
            }
        });
    }

    async createUser(data) {
        return await prisma.user.create({ data });
    }

    async updateUser(id, data) {
        return await prisma.user.update({
            where: { id },
            data,
        });
    }

    async updateUserWithSelectedFields(id, data, selectFields) {
        return await prisma.user.update({
            where: { id },
            data,
            select: selectFields
        });
    }

    async updateLastLogin(id) {
        return await prisma.user.update({
            where: { id },
            data: { 
                lastLogin: new Date(),
                loginHistory: {
                    create: {}
                }
            }
        });
    }

    async getAllUsersWithSelectedFields(selectFields) {
        return await prisma.user.findMany({
            select: selectFields,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAllUsersSelectedFieldsOnly() {
        return await prisma.user.findMany({
            select: { id: true, username: true, role: true }
        });
    }

    async deleteUser(id) {
        return await prisma.user.delete({ where: { id } });
    }

    async countAdmins() {
        return await prisma.user.count({ where: { role: 'admin' } });
    }

    async getMonthlySales(userId, startOfMonth) {
        return await prisma.sale.findMany({
            where: {
                userId,
                createdAt: { gte: startOfMonth }
            }
        });
    }

    async getMonthlyLoginHistory(userId, startOfMonth) {
        return await prisma.loginhistory.findMany({
            where: {
                userId,
                loginAt: { gte: startOfMonth }
            },
            select: { loginAt: true }
        });
    }

    async getAllPrimes(userId) {
        return await prisma.prime.findMany({
            where: { userId },
            orderBy: { distributedAt: 'desc' }
        });
    }

    async getLastSystemDistribution() {
        return await prisma.prime.findFirst({
            orderBy: { distributedAt: 'desc' },
            select: { amount: true, reason: true, distributedAt: true }
        });
    }

    async getDailyRevenue(startOfToday) {
        return await prisma.sale.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: startOfToday } },
            _sum: { totalAmount: true }
        });
    }

    async getSalesSince(startOfMonth) {
        return await prisma.sale.findMany({
            where: { createdAt: { gte: startOfMonth } },
            select: { userId: true, createdAt: true }
        });
    }

    async getLoginsSince(startOfMonth) {
        return await prisma.loginhistory.findMany({
            where: { loginAt: { gte: startOfMonth } },
            select: { userId: true, loginAt: true }
        });
    }

    async createPrimes(dataArray) {
        return await prisma.prime.createMany({ data: dataArray });
    }

    async createSalaryPayments(dataArray) {
        return await prisma.salarypayment.createMany({ data: dataArray });
    }

    async getLastSalaryDistribution() {
        return await prisma.salarypayment.findFirst({
            orderBy: { paidAt: 'desc' },
            select: { amount: true, month: true, paidAt: true }
        });
    }

    async getAllSalaryPayments(userId) {
        return await prisma.salarypayment.findMany({
            where: { userId },
            orderBy: { paidAt: 'desc' },
            include: { user: { select: { fullName: true, username: true } } }
        });
    }

    async getSalaryPaymentsSince(date) {
        return await prisma.salarypayment.findMany({
            where: { paidAt: { gte: date } },
            select: { userId: true, amount: true, month: true, paidAt: true }
        });
    }

    async getAllGlobalSalaryHistory() {
        return await prisma.salarypayment.findMany({
            orderBy: { paidAt: 'desc' },
            include: { user: { select: { fullName: true, username: true } } }
        });
    }
}

module.exports = new UserRepository();
