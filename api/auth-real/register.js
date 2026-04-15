// Register endpoint for Vercel serverless functions
const jwt = require('jsonwebtoken');

// Mock user data storage (in production, use database)
let mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin',
    role: 'admin'
  }
];
let nextId = 2;

export default async function handler(req, res) {
  try {
    const { method } = req;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] POST /api/auth-real/register`);
    console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);

    if (method === 'POST') {
      const { username, email, password, role = 'cashier' } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Username, email, and password are required' 
        });
      }

      let newUser = null;
      let existingUser = null;

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

          // Check if user already exists
          existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: username.trim() },
                { email: email.trim() }
              ]
            }
          });

          if (!existingUser) {
            // Create new user
            newUser = await prisma.user.create({
              data: {
                username: username.trim(),
                email: email.trim(),
                password: password,
                role: role
              }
            });
          }
          
          await prisma.$disconnect();
        } catch (dbError) {
          console.log('Database connection failed, using mock data:', dbError.message);
        }
      }

      // Fallback to mock data if database failed or not available
      if (!newUser) {
        // Check if user already exists in mock data
        existingUser = mockUsers.find(u => 
          u.username === username.trim() || u.email === email.trim()
        );
        
        if (existingUser) {
          return res.status(400).json({ 
            message: 'Username or email already exists' 
          });
        }

        // Create new user in mock data
        newUser = {
          id: nextId++,
          username: username.trim(),
          email: email.trim(),
          password: password,
          role: role
        };
        
        mockUsers.push(newUser);
        console.log('Using mock data for registration');
      }
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Username or email already exists' 
        });
      }
      
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
  }
}
