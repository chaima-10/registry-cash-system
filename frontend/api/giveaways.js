// Mock Giveaway Data
let mockGiveaways = [
    {
        id: 1,
        title: "Test Giveaway 1",
        description: "Test giveaway for demo purposes",
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        winnerCount: 1,
        status: "ACTIVE",
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

let mockParticipants = [];
let mockWinners = [];

export default function handler(req, res) {
  try {
    const { method } = req;

    if (method === 'GET') {
      // Get all giveaways
      const formattedGiveaways = mockGiveaways.map(giveaway => ({
        ...giveaway,
        participantCount: mockParticipants.filter(p => p.giveawayId === giveaway.id).length,
        creator: { id: 1, username: "admin" }
      }));
      return res.json(formattedGiveaways);
    }

    if (method === 'POST' && req.url.includes('/participate')) {
      // Participate in giveaway
      const { id } = req.query;
      const giveawayId = parseInt(id);
      const userId = 1; // Mock user ID

      const giveaway = mockGiveaways.find(g => g.id === giveawayId);
      
      if (!giveaway) {
        return res.status(404).json({ message: 'Giveaway not found' });
      }

      if (giveaway.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Giveaway is not active' });
      }

      if (new Date(giveaway.endDate) <= new Date()) {
        return res.status(400).json({ message: 'Giveaway has ended' });
      }

      const existingParticipation = mockParticipants.find(p => p.giveawayId === giveawayId && p.userId === userId);
      
      if (existingParticipation) {
        return res.status(400).json({ message: 'You have already participated in this giveaway' });
      }

      const participation = {
        id: mockParticipants.length + 1,
        giveawayId,
        userId,
        joinedAt: new Date()
      };

      mockParticipants.push(participation);
      return res.status(201).json({ message: 'Successfully participated in giveaway', participation });
    }

    if (method === 'POST' && req.url.includes('/select-winners')) {
      // Select winners
      const { id } = req.query;
      const giveawayId = parseInt(id);

      const giveaway = mockGiveaways.find(g => g.id === giveawayId);
      
      if (!giveaway) {
        return res.status(404).json({ message: 'Giveaway not found' });
      }

      if (giveaway.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Giveaway is not active' });
      }

      const participants = mockParticipants.filter(p => p.giveawayId === giveawayId);
      
      if (participants.length === 0) {
        return res.status(400).json({ message: 'No participants in this giveaway' });
      }

      const existingWinners = mockWinners.filter(w => w.giveawayId === giveawayId);
      if (existingWinners.length > 0) {
        return res.status(400).json({ message: 'Winners have already been selected' });
      }

      // Random winner selection
      const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
      const selectedWinners = shuffledParticipants.slice(0, Math.min(giveaway.winnerCount, participants.length));

      // Create winner records
      const winnerData = selectedWinners.map((participant, index) => ({
        id: mockWinners.length + index + 1,
        giveawayId,
        userId: participant.userId,
        rank: index + 1,
        selectedAt: new Date()
      }));

      mockWinners.push(...winnerData);

      // Update giveaway status
      const giveawayIndex = mockGiveaways.findIndex(g => g.id === giveawayId);
      mockGiveaways[giveawayIndex].status = 'ENDED';

      return res.json({ 
        message: 'Winners selected successfully', 
        winners: winnerData,
        totalParticipants: participants.length 
      });
    }

    if (method === 'POST' && !req.url.includes('/participate') && !req.url.includes('/select-winners')) {
      // Create giveaway
      const { title, description, startDate, endDate, winnerCount } = req.body;
      
      if (!title || !endDate) {
        return res.status(400).json({ message: 'Title and end date are required' });
      }

      if (new Date(endDate) <= new Date()) {
        return res.status(400).json({ message: 'End date must be in future' });
      }

      const newGiveaway = {
        id: mockGiveaways.length + 1,
        title,
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        winnerCount: parseInt(winnerCount) || 1,
        status: 'ACTIVE',
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGiveaways.push(newGiveaway);
      return res.status(201).json(newGiveaway);
    }

    if (method === 'GET' && req.url.includes('/giveaways/')) {
      // Get single giveaway
      const { id } = req.query;
      const giveawayId = parseInt(id);
      const giveaway = mockGiveaways.find(g => g.id === giveawayId);
      
      if (!giveaway) {
        return res.status(404).json({ message: 'Giveaway not found' });
      }

      const participants = mockParticipants.filter(p => p.giveawayId === giveawayId);
      const winners = mockWinners.filter(w => w.giveawayId === giveawayId);

      return res.json({
        ...giveaway,
        participants: participants.map(p => ({
          ...p,
          user: { id: p.userId, username: `user${p.userId}` }
        })),
        winners: winners.map(w => ({
          ...w,
          user: { id: w.userId, username: `user${w.userId}` }
        }))
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Giveaway API error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
