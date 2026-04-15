// Real database-connected giveaways serverless function for Vercel with Aiven
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client for serverless environment
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  prisma = new PrismaClient();
}

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default async function handler(req, res) {
  try {
    const { method } = req;
    const { id } = req.query;
    const url = req.url;

    // Handle different URL patterns
    const isParticipate = url.includes('/participate');
    const isSelectWinners = url.includes('/select-winners');

    console.log(`[${new Date().toISOString()}] ${method} /api/giveaways-real${id ? '/' + id : ''}${isParticipate ? '/participate' : ''}${isSelectWinners ? '/select-winners' : ''}`);

    switch (method) {
      case 'GET':
        if (id && !isParticipate && !isSelectWinners) {
          // Get single giveaway
          const giveawayId = parseInt(id);
          const giveaway = await prisma.giveaway.findUnique({
            where: { id: giveawayId },
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true
                    }
                  }
                }
              },
              winners: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true
                    }
                  }
                },
                orderBy: {
                  rank: 'asc'
                }
              },
              creator: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          });
          
          if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
          }

          return res.json(giveaway);
        } else {
          // Get all giveaways
          const giveaways = await prisma.giveaway.findMany({
            include: {
              _count: {
                select: {
                  participants: true,
                  winners: true
                }
              },
              creator: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          return res.json(giveaways);
        }

      case 'POST':
        if (isParticipate) {
          // Participate in giveaway
          const giveawayId = parseInt(id);
          
          // Get user from token (simplified - in production, verify JWT)
          const authHeader = req.headers.authorization;
          let userId = 1; // Default fallback
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // TODO: Verify JWT token properly
            userId = 1; // Mock user ID for now
          }

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

          const existingParticipation = await prisma.giveawayParticipation.findFirst({
            where: {
              giveawayId: giveawayId,
              userId: userId
            }
          });
          
          if (existingParticipation) {
            return res.status(400).json({ message: 'You have already participated in this giveaway' });
          }

          const participation = await prisma.giveawayParticipation.create({
            data: {
              giveawayId: giveawayId,
              userId: userId,
              joinedAt: new Date()
            }
          });

          return res.status(201).json({ message: 'Successfully participated in giveaway', participation });
        } else if (isSelectWinners) {
          // Select winners
          const giveawayId = parseInt(id);

          const giveaway = await prisma.giveaway.findUnique({
            where: { id: giveawayId }
          });
          
          if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
          }

          if (giveaway.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Giveaway is not active' });
          }

          const participants = await prisma.giveawayParticipation.findMany({
            where: { giveawayId: giveawayId }
          });
          
          if (participants.length === 0) {
            return res.status(400).json({ message: 'No participants in this giveaway' });
          }

          const existingWinners = await prisma.giveawayWinner.findMany({
            where: { giveawayId: giveawayId }
          });
          
          if (existingWinners.length > 0) {
            return res.status(400).json({ message: 'Winners have already been selected' });
          }

          // Random winner selection
          const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
          const selectedParticipants = shuffledParticipants.slice(0, Math.min(giveaway.winnerCount, participants.length));

          // Create winner records
          const winnerData = selectedParticipants.map((participant, index) => ({
            giveawayId: giveawayId,
            userId: participant.userId,
            rank: index + 1,
            selectedAt: new Date()
          }));

          await prisma.giveawayWinner.createMany({
            data: winnerData
          });

          // Update giveaway status
          await prisma.giveaway.update({
            where: { id: giveawayId },
            data: { status: 'ENDED' }
          });

          return res.json({ 
            message: 'Winners selected successfully', 
            winners: winnerData,
            totalParticipants: participants.length 
          });
        } else {
          // Create giveaway
          const { title, description, startDate, endDate, winnerCount } = req.body;
          
          if (!title || !endDate) {
            return res.status(400).json({ message: 'Title and end date are required' });
          }

          if (new Date(endDate) <= new Date()) {
            return res.status(400).json({ message: 'End date must be in future' });
          }

          // Get user from token
          const authHeader = req.headers.authorization;
          let createdBy = 1; // Default fallback
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // TODO: Verify JWT token properly
            createdBy = 1; // Mock user ID for now
          }

          const newGiveaway = await prisma.giveaway.create({
            data: {
              title,
              description,
              startDate: startDate ? new Date(startDate) : new Date(),
              endDate: new Date(endDate),
              winnerCount: parseInt(winnerCount) || 1,
              status: 'ACTIVE',
              createdBy: createdBy
            }
          });

          return res.status(201).json(newGiveaway);
        }

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ message: 'Giveaway ID is required' });
        }

        const giveawayId = parseInt(id);
        
        // Delete giveaway and related data
        await prisma.giveawayWinner.deleteMany({
          where: { giveawayId: giveawayId }
        });
        
        await prisma.giveawayParticipation.deleteMany({
          where: { giveawayId: giveawayId }
        });
        
        const deletedGiveaway = await prisma.giveaway.delete({
          where: { id: giveawayId }
        });

        return res.json({ message: 'Giveaway deleted successfully', giveaway: deletedGiveaway });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ message: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Giveaway API Error:', error);
    console.error('Stack:', error.stack);
    
    // Check for database connection issues
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Check DATABASE_URL and Aiven configuration.',
        error: error.message,
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    if (error.code === 'P1001') {
      return res.status(500).json({ 
        message: 'Database connection timeout. Check Aiven network settings.',
        error: error.message,
        code: 'DB_TIMEOUT'
      });
    }
    
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Ensure database connection is closed in serverless environment
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
