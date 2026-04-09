// Setup admin user endpoint for initial database setup
const { PrismaClient } = require('@prisma/client');

export default async function handler(req, res) {
  try {
    const { method } = req;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${method} /api/setup-admin`);

    if (method === 'POST') {
      // Initialize Prisma client
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      try {
        // Check if admin user already exists
        const existingAdmin = await prisma.user.findUnique({
          where: { username: 'admin' }
        });

        if (existingAdmin) {
          return res.status(400).json({
            message: 'Admin user already exists',
            user: {
              id: existingAdmin.id,
              username: existingAdmin.username,
              role: existingAdmin.role
            }
          });
        }

        // Create admin user
        const adminUser = await prisma.user.create({
          data: {
            username: 'admin',
            email: 'admin@example.com',
            password: 'password', // In production, use bcrypt to hash
            role: 'admin'
          }
        });

        console.log('Admin user created:', adminUser.username);

        return res.status(201).json({
          message: 'Admin user created successfully',
          credentials: {
            username: 'admin',
            password: 'password'
          },
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role
          }
        });

      } finally {
        await prisma.$disconnect();
      }
    }

    if (method === 'GET') {
      return res.status(200).json({
        message: 'Admin setup endpoint',
        instructions: 'POST to this endpoint to create admin user',
        credentials: {
          username: 'admin',
          password: 'password'
        }
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Setup admin error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
