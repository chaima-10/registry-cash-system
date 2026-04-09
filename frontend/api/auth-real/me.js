// User profile endpoint for Vercel serverless functions
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Initialize Prisma client
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

export default async function handler(req, res) {
  try {
    const { method } = req;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] GET /api/auth-real/me`);

    if (method === 'GET') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          message: 'No token provided' 
        });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        });
        
        if (!user) {
          return res.status(401).json({ 
            message: 'User not found' 
          });
        }

        console.log('User profile retrieved:', user.username);
        
        return res.json(user);
      } catch (jwtError) {
        return res.status(401).json({ 
          message: 'Invalid token' 
        });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Profile endpoint error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
