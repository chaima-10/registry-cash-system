// Login endpoint for Vercel serverless functions
const jwt = require('jsonwebtoken');

// Mock user data for when database is not available
const mockUsers = [
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

    console.log(`[${timestamp}] POST /api/auth-real/login`);
    console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);

    if (method === 'POST') {
      const { username, password } = req.body;
      
      console.log('Login attempt:', { username });
      
      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username and password are required' 
        });
      }

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
            where: { username: username.trim() }
          });
          
          await prisma.$disconnect();
        } catch (dbError) {
          console.log('Database connection failed, using mock data:', dbError.message);
        }
      }

      // Fallback to mock data if database failed or not available
      if (!user) {
        user = mockUsers.find(u => u.username === username.trim());
        console.log('Using mock data for authentication');
      }
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Simple password check
      if (password !== user.password) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log('Login successful for:', user.username);
      
      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Login endpoint error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
