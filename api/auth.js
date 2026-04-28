import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ✅ Prisma (global for serverless)
let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient();
}
prisma = global.prisma;

// ✅ Check JWT_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// ✅ Generate token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export default async function handler(req, res) {
  // ✅ CORS (secure)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.FRONTEND_URL || '*'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, url } = req;

    let action = '';
    if (url?.includes('login')) action = 'login';
    else if (url?.includes('register')) action = 'register';
    else if (url?.includes('me')) action = 'me';

    // ================= LOGIN =================
    if (method === 'POST' && action === 'login') {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          message: 'Username and password are required'
        });
      }

      const user = await prisma.user.findUnique({
        where: { username: username.trim() }
      });

      if (!user) {
        return res.status(401).json({
          message: 'Invalid credentials'
        });
      }

      // ✅ bcrypt compare
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({
          message: 'Invalid credentials'
        });
      }

      const token = generateToken(user);

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

    // ================= REGISTER =================
    if (method === 'POST' && action === 'register') {
      const { username, email, password, role = 'cashier' } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          message: 'All fields are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: 'Password must be at least 6 characters'
        });
      }

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

      // ✅ hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          username: username.trim(),
          email: email.trim(),
          password: hashedPassword,
          role
        }
      });

      const token = generateToken(newUser);

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

    // ================= ME =================
    if (method === 'GET' && action === 'me') {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          message: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
      } catch (err) {
        return res.status(401).json({
          message: 'Invalid token'
        });
      }
    }

    return res.status(405).json({
      message: `Method ${method} not allowed`
    });

  } catch (error) {
    console.error('Auth Error:', error);

    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}
