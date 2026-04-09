// User profile endpoint for Vercel serverless functions
const jwt = require('jsonwebtoken');

// Mock user data storage (shared with register.js)
let mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin',
    role: 'admin'
  },
  {
    id: 2,
    username: 'cashier',
    email: 'cashier@example.com',
    password: 'cashier',
    role: 'cashier'
  }
];

export default async function handler(req, res) {
  try {
    const { method } = req;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] GET /api/auth-real/me`);
    console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);

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
        
        let user = null;

        // Try database first if available
        if (process.env.DATABASE_URL) {
          try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient({
              datasources: {
                db: {
                  url: process.env.DATABASE_URL,
                },
              },
            });

            user = await prisma.user.findUnique({
              where: { id: decoded.id },
              select: {
                id: true,
                username: true,
                email: true,
                role: true
              }
            });
            
            await prisma.$disconnect();
          } catch (dbError) {
            console.log('Database connection failed, using mock data:', dbError.message);
          }
        }

        // Fallback to mock data if database failed or not available
        if (!user) {
          user = mockUsers.find(u => u.id === decoded.id);
          console.log('Using mock data for user profile');
        }
        
        if (!user) {
          return res.status(401).json({ 
            message: 'User not found' 
          });
        }

        // Return user without password
        const userProfile = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        };

        console.log('User profile retrieved:', userProfile.username);
        
        return res.json(userProfile);
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
  }
}
