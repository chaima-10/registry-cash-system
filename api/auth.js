// Real database-connected auth serverless function for Vercel with Aiven
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

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

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: '24h' }
  );
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method } = req;
    const url = req.url;
    
    // Parse URL to determine action
    let action = '';
    if (url && (url.includes('/login') || url === 'login')) {
      action = 'login';
    } else if (url && (url.includes('/register') || url === 'register')) {
      action = 'register';
    } else if (url && (url.includes('/me') || url === 'me')) {
      action = 'me';
    }

    console.log(`[${new Date().toISOString()}] ${method} ${url} (action: ${action})`);

    switch (method) {
      case 'POST':
        if (action === 'login') {
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

          // In production, use bcrypt to compare passwords
          // For now, simple comparison (update with bcrypt later)
          if (password !== user.password) {
            return res.status(401).json({ 
              message: 'Invalid credentials' 
            });
          }

          // Generate JWT token
          const token = generateToken(user);
          
          console.log(`User logged in: ${user.username}`);
          
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
        } else if (action === 'register') {
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

          // Hash password in production (using bcrypt)
          // For now, store as plain text (UPDATE THIS FOR PRODUCTION)
          const newUser = await prisma.user.create({
            data: {
              username: username.trim(),
              email: email.trim(),
              password: password, // TODO: Hash with bcrypt
              role: role
            }
          });
          
          const token = generateToken(newUser);
          
          console.log(`User registered: ${newUser.username}`);
          
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
        break;

      case 'GET':
        if (action === 'me') {
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

            return res.json(user);
          } catch (jwtError) {
            return res.status(401).json({ 
              message: 'Invalid token' 
            });
          }
        }
        break;

      default:
        return res.status(405).json({ 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    
    // Check for database connection issues
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Check DATABASE_URL and Aiven configuration.',
        error: error.message,
        code: 'DB_CONNECTION_ERROR'
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
