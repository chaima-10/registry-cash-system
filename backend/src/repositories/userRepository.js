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
}

module.exports = new UserRepository();
