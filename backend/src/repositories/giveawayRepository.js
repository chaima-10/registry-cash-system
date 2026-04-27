const prisma = require('../config/prisma');

class GiveawayRepository {
    async createGiveaway(data) {
        return await prisma.giveaway.create({ data });
    }

    async getAllGiveaways() {
        return await prisma.giveaway.findMany({
            include: {
                creator: { select: { id: true, username: true } },
                _count: { select: { participants: true } },
                winners: {
                    include: {
                        user: { select: { id: true, username: true, fullName: true } },
                        participation: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getGiveawayById(id) {
        return await prisma.giveaway.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, username: true } },
                participants: {
                    include: {
                        user: { select: { id: true, username: true } }
                    }
                },
                winners: {
                    include: {
                        user: { select: { id: true, username: true, fullName: true } },
                        participation: true
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });
    }

    async getGiveawayParticipation(where) {
        return await prisma.giveawayparticipation.findFirst({ where });
    }

    async createParticipation(data) {
        return await prisma.giveawayparticipation.create({ data });
    }

    async createWinners(winnerData) {
        return await prisma.giveawaywinner.createMany({ data: winnerData });
    }

    async updateGiveawayStatus(id, status) {
        return await prisma.giveaway.update({
            where: { id },
            data: { status }
        });
    }

    async getUserParticipations(userId) {
        return await prisma.giveawayparticipation.findMany({
            where: { userId },
            include: {
                giveaway: {
                    include: {
                        creator: { select: { username: true } }
                    }
                }
            },
            orderBy: { joinedAt: 'desc' }
        });
    }

    async getUserWins(userId) {
        return await prisma.giveawaywinner.findMany({
            where: { userId },
            include: {
                giveaway: {
                    include: {
                        creator: { select: { username: true } }
                    }
                }
            },
            orderBy: { selectedAt: 'desc' }
        });
    }

    async deleteGiveaway(id) {
        return await prisma.giveaway.delete({ where: { id } });
    }
}

module.exports = new GiveawayRepository();
