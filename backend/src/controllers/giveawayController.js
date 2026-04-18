const prisma = require('../config/prisma');

// Create Giveaway
exports.createGiveaway = async (req, res) => {
    try {
        const { title, description, startDate, endDate, winnerCount } = req.body;
        const createdBy = req.user.id;

        // Validation
        if (!title || !endDate) {
            return res.status(400).json({ message: 'Title and end date are required' });
        }

        if (new Date(endDate) <= new Date()) {
            return res.status(400).json({ message: 'End date must be in the future' });
        }

        if (winnerCount < 1 || winnerCount > 100) {
            return res.status(400).json({ message: 'Winner count must be between 1 and 100' });
        }

        const giveaway = await prisma.giveaway.create({
            data: {
                title,
                description,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: new Date(endDate),
                winnerCount: parseInt(winnerCount) || 1,
                status: 'ACTIVE',
                createdBy
            }
        });

        res.status(201).json(giveaway);
    } catch (error) {
        console.error('Error creating giveaway:', error);
        res.status(500).json({ message: 'Error creating giveaway', error: error.message });
    }
};

// Get All Giveaways
exports.getAllGiveaways = async (req, res) => {
    try {
        const giveaways = await prisma.giveaway.findMany({
            include: {
                creator: {
                    select: { id: true, username: true }
                },
                _count: {
                    select: {
                        participants: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Format response
        const formattedGiveaways = giveaways.map(giveaway => ({
            ...giveaway,
            participantCount: giveaway._count.participants,
            creator: giveaway.creator
        }));

        res.json(formattedGiveaways);
    } catch (error) {
        console.error('Error fetching giveaways:', error);
        res.status(500).json({ message: 'Error fetching giveaways', error: error.message });
    }
};

// Get Single Giveaway
exports.getGiveawayById = async (req, res) => {
    try {
        const { id } = req.params;
        const giveaway = await prisma.giveaway.findUnique({
            where: { id: parseInt(id) },
            include: {
                creator: {
                    select: { id: true, username: true }
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true }
                        }
                    }
                },
                winners: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true }
                        },
                        participation: true
                    },
                    orderBy: {
                        rank: 'asc'
                    }
                }
            }
        });

        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        res.json(giveaway);
    } catch (error) {
        console.error('Error fetching giveaway:', error);
        res.status(500).json({ message: 'Error fetching giveaway', error: error.message });
    }
};

// Participate in Giveaway
exports.participateInGiveaway = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientName, clientSurname, clientPhone } = req.body;
        const userId = req.user.id;
        const giveawayId = parseInt(id);

        // 1. Admin restricted from participation
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: 'Admins are not allowed to participate in giveaways' });
        }

        // Check if giveaway exists and is active
        const giveaway = await prisma.giveaway.findUnique({
            where: { id: giveawayId }
        });

        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        if (giveaway.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Giveaway is not active' });
        }

        if (new Date(giveaway.endDate) <= new Date()) {
            return res.status(400).json({ message: 'Giveaway has ended' });
        }

        // Check if user already participated (by userId)
        // If it's a cashier registering a client, we might need a different check
        const existingParticipation = await prisma.giveawayparticipation.findFirst({
            where: {
                giveawayId,
                userId: req.user.role === 'cashier' ? undefined : userId, // Skip userId check for cashiers if they are registering others
                clientPhone: clientPhone || undefined
            }
        });

        if (existingParticipation && (clientPhone && existingParticipation.clientPhone === clientPhone)) {
            return res.status(400).json({ message: 'This client has already participated in this giveaway' });
        }

        if (existingParticipation && !clientPhone && existingParticipation.userId === userId) {
            return res.status(400).json({ message: 'You have already participated in this giveaway' });
        }

        // Create participation
        const participation = await prisma.giveawayparticipation.create({
            data: {
                giveawayId,
                userId: req.user.role === 'cashier' ? null : userId, // Don't associate cashier ID as participant
                clientName: clientName || null,
                clientSurname: clientSurname || null,
                clientPhone: clientPhone || null
            }
        });

        res.status(201).json({ message: 'Successfully participated in giveaway', participation });
    } catch (error) {
        console.error('Error participating in giveaway:', error);
        res.status(500).json({ message: 'Error participating in giveaway', error: error.message });
    }
};

// Select Winners (Random Selection)
exports.selectWinners = async (req, res) => {
    try {
        const { id } = req.params;
        const giveawayId = parseInt(id);

        // Get giveaway with participants
        const giveaway = await prisma.giveaway.findUnique({
            where: { id: giveawayId },
            include: {
                participants: {
                    include: {
                        user: true
                    }
                },
                winners: true
            }
        });

        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        if (giveaway.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Giveaway is not active' });
        }

        if (new Date(giveaway.endDate) > new Date()) {
            return res.status(400).json({ message: 'Giveaway has not ended yet' });
        }

        if (giveaway.participants.length === 0) {
            return res.status(400).json({ message: 'No participants in this giveaway' });
        }

        // Check if winners already selected
        if (giveaway.winners.length > 0) {
            return res.status(400).json({ message: 'Winners have already been selected' });
        }

        // Random winner selection
        const shuffledParticipants = giveaway.participants.sort(() => 0.5 - Math.random());
        const selectedWinners = shuffledParticipants.slice(0, Math.min(giveaway.winnerCount, giveaway.participants.length));

        // Create winner records
        const winnerData = selectedWinners.map((participant, index) => ({
            giveawayId,
            participationId: participant.id,
            userId: participant.userId || null,
            rank: index + 1
        }));

        await prisma.giveawaywinner.createMany({
            data: winnerData
        });

        // Update giveaway status
        await prisma.giveaway.update({
            where: { id: giveawayId },
            data: { status: 'ENDED' }
        });

        res.json({ 
            message: 'Winners selected successfully', 
            winnersCount: winnerData.length,
            totalParticipants: giveaway.participants.length 
        });
    } catch (error) {
        console.error('Error selecting winners:', error);
        res.status(500).json({ message: 'Error selecting winners', error: error.message });
    }
};

// Get User's Giveaway History
exports.getUserGiveawayHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const participations = await prisma.giveawayparticipation.findMany({
            where: { userId },
            include: {
                giveaway: {
                    include: {
                        creator: {
                            select: { username: true }
                        }
                    }
                }
            },
            orderBy: {
                joinedAt: 'desc'
            }
        });

        const wins = await prisma.giveawaywinner.findMany({
            where: { userId },
            include: {
                giveaway: {
                    include: {
                        creator: {
                            select: { username: true }
                        }
                    }
                }
            },
            orderBy: {
                selectedAt: 'desc'
            }
        });

        res.json({
            participations,
            wins,
            totalParticipations: participations.length,
            totalWins: wins.length
        });
    } catch (error) {
        console.error('Error fetching user giveaway history:', error);
        res.status(500).json({ message: 'Error fetching giveaway history', error: error.message });
    }
};

// Delete Giveaway (Admin only)
exports.deleteGiveaway = async (req, res) => {
    try {
        const { id } = req.params;
        const giveawayId = parseInt(id);

        // Check if giveaway exists
        const giveaway = await prisma.giveaway.findUnique({
            where: { id: giveawayId }
        });

        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        // Only admin or creator can delete
        if (req.user.role !== 'admin' && giveaway.createdBy !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this giveaway' });
        }

        // Delete giveaway (cascade will delete participants and winners)
        await prisma.giveaway.delete({
            where: { id: giveawayId }
        });

        res.json({ message: 'Giveaway deleted successfully' });
    } catch (error) {
        console.error('Error deleting giveaway:', error);
        res.status(500).json({ message: 'Error deleting giveaway', error: error.message });
    }
};
