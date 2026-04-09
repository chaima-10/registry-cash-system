// Login endpoint for Vercel serverless functions
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

    console.log(`[${timestamp}] POST /api/auth-real/login`);

    if (method === 'POST') {
      const { username, password } = req.body;
      
      console.log('Login attempt:', { username });
      
      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username and password are required' 
        });
      }

      // Find user by username
      const user = await prisma.user.findUnique({
        where: { username: username.trim() }
      });
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Simple password check (in production, use bcrypt)
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
  } finally {
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
