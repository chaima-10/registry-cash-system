// Register endpoint for Vercel serverless functions
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

    console.log(`[${timestamp}] POST /api/auth-real/register`);

    if (method === 'POST') {
      const { username, email, password, role = 'cashier' } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Username, email, and password are required' 
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: username.trim() },
            { email: email.trim() }
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Username or email already exists' 
        });
      }

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          username: username.trim(),
          email: email.trim(),
          password: password, // In production, hash with bcrypt
          role: role
        }
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: newUser.id, 
          username: newUser.username, 
          role: newUser.role 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log('Registration successful for:', newUser.username);
      
      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Register endpoint error:', error);
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
