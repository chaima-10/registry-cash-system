const giveawayRepository = require('../repositories/giveawayRepository');

class GiveawayService {
    async createGiveaway(data, createdBy) {
        const { title, description, startDate, endDate, winnerCount } = data;

        if (!title || !endDate) {
            throw new Error('Title and end date are required');
        }

        if (new Date(endDate) <= new Date()) {
            throw new Error('End date must be in the future');
        }

        if (winnerCount < 1 || winnerCount > 100) {
            throw new Error('Winner count must be between 1 and 100');
        }

        return await giveawayRepository.createGiveaway({
            title,
            description,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: new Date(endDate),
            winnerCount: parseInt(winnerCount) || 1,
            status: 'ACTIVE',
            createdBy
        });
    }

    async getAllGiveaways() {
        const giveaways = await giveawayRepository.getAllGiveaways();
        return giveaways.map(giveaway => ({
            ...giveaway,
            participantCount: giveaway._count.participants,
            creator: giveaway.creator
        }));
    }

    async getGiveawayById(id) {
        const giveaway = await giveawayRepository.getGiveawayById(id);
        if (!giveaway) {
            throw new Error('Giveaway not found');
        }
        return giveaway;
    }

    async participateInGiveaway(giveawayId, userId, userRole, clientData) {
        const { clientName, clientSurname, clientPhone } = clientData;

        if (userRole !== 'cashier') {
            throw new Error('Only cashiers can register participants for giveaways');
        }

        if (!clientName || !clientSurname || !clientPhone) {
            throw new Error('Client name, surname and phone are required');
        }

        const nameRegex = /^[a-zA-Z\sÀ-ÿ]+$/;
        if (!nameRegex.test(clientName) || !nameRegex.test(clientSurname)) {
            throw new Error('Name and Surname must contain only letters');
        }

        const cleanPhone = clientPhone.replace(/\s/g, '');
        if (!/^\+?[0-9]+$/.test(cleanPhone)) {
            throw new Error('Phone must contain only digits and optional +');
        }

        if (cleanPhone.startsWith('+216')) {
            const numberPart = cleanPhone.substring(4);
            if (numberPart.length !== 8 || !/^\d+$/.test(numberPart)) {
                throw new Error('Tunisian phone with +216 must have exactly 8 digits after the prefix');
            }
        } else {
            const localPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
            if (localPhone.length !== 8 || !/^\d+$/.test(localPhone)) {
                throw new Error('Local Tunisian phone must be exactly 8 digits');
            }
        }

        const giveaway = await giveawayRepository.getGiveawayById(giveawayId);
        if (!giveaway) {
            throw new Error('Giveaway not found');
        }
        if (giveaway.status !== 'ACTIVE') {
            throw new Error('Giveaway is not active');
        }
        if (new Date(giveaway.endDate) <= new Date()) {
            throw new Error('Giveaway has ended');
        }

        const existingParticipation = await giveawayRepository.getGiveawayParticipation({
            giveawayId,
            userId: userRole === 'cashier' ? undefined : userId,
            clientPhone: clientPhone || undefined
        });

        if (existingParticipation && (clientPhone && existingParticipation.clientPhone === clientPhone)) {
            throw new Error('This client has already participated in this giveaway');
        }

        if (existingParticipation && !clientPhone && existingParticipation.userId === userId) {
            throw new Error('You have already participated in this giveaway');
        }

        return await giveawayRepository.createParticipation({
            giveawayId,
            userId: userRole === 'cashier' ? null : userId,
            clientName: clientName || null,
            clientSurname: clientSurname || null,
            clientPhone: clientPhone || null
        });
    }

    async selectWinners(giveawayId) {
        const giveaway = await giveawayRepository.getGiveawayById(giveawayId);

        if (!giveaway) {
            throw new Error('Giveaway not found');
        }
        if (new Date(giveaway.endDate) > new Date()) {
            throw new Error('Giveaway has not ended yet');
        }
        if (giveaway.participants.length === 0) {
            throw new Error('No participants in this giveaway');
        }
        if (giveaway.winners.length > 0) {
            return { 
                message: 'Winners already selected', 
                winnersCount: giveaway.winners.length,
                winners: giveaway.winners,
                totalParticipants: giveaway.participants.length 
            };
        }

        const shuffledParticipants = giveaway.participants.sort(() => 0.5 - Math.random());
        const selectedWinners = shuffledParticipants.slice(0, Math.min(giveaway.winnerCount, giveaway.participants.length));

        const winnerData = selectedWinners.map((participant, index) => ({
            giveawayId,
            participationId: participant.id,
            userId: participant.userId || null,
            rank: index + 1
        }));

        await giveawayRepository.createWinners(winnerData);
        await giveawayRepository.updateGiveawayStatus(giveawayId, 'ENDED');

        return { 
            message: 'Winners selected successfully', 
            winnersCount: winnerData.length,
            winners: selectedWinners,
            totalParticipants: giveaway.participants.length 
        };
    }

    async getUserGiveawayHistory(userId) {
        const participations = await giveawayRepository.getUserParticipations(userId);
        const wins = await giveawayRepository.getUserWins(userId);

        return {
            participations,
            wins,
            totalParticipations: participations.length,
            totalWins: wins.length
        };
    }

    async deleteGiveaway(giveawayId, userId, userRole) {
        const giveaway = await giveawayRepository.getGiveawayById(giveawayId);
        if (!giveaway) {
            throw new Error('Giveaway not found');
        }

        if (userRole !== 'admin' && giveaway.createdBy !== userId) {
            throw new Error('Not authorized to delete this giveaway');
        }

        await giveawayRepository.deleteGiveaway(giveawayId);
    }
}

module.exports = new GiveawayService();
