// Auth serverless function for Vercel
let mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    username: 'cashier',
    email: 'cashier@example.com',
    role: 'cashier',
    createdAt: new Date().toISOString()
  }
];

// Mock JWT token (in production, use proper JWT)
const generateMockToken = (user) => {
  return `mock-jwt-token-${user.id}-${Date.now()}`;
};

export default function handler(req, res) {
  try {
    const { method } = req;
    const { action } = req.query;

    console.log(`[${new Date().toISOString()}] ${method} /api/auth${action ? '/' + action : ''}`);

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
          const user = mockUsers.find(u => u.username === username);
          
          if (!user) {
            return res.status(401).json({ 
              message: 'Invalid credentials' 
            });
          }

          // Mock password check (in production, use bcrypt)
          if (password !== 'password') {
            return res.status(401).json({ 
              message: 'Invalid credentials' 
            });
          }

          // Generate mock token
          const token = generateMockToken(user);
          
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
          const existingUser = mockUsers.find(u => u.username === username || u.email === email);
          
          if (existingUser) {
            return res.status(400).json({ 
              message: 'Username or email already exists' 
            });
          }

          const newUser = {
            id: mockUsers.length + 1,
            username,
            email,
            role,
            createdAt: new Date().toISOString()
          };

          mockUsers.push(newUser);
          
          const token = generateMockToken(newUser);
          
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
          // Mock token verification
          const authHeader = req.headers.authorization;
          
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
              message: 'No token provided' 
            });
          }

          const token = authHeader.split(' ')[1];
          
          // Extract user ID from mock token
          const userId = parseInt(token.split('-')[2]);
          
          if (isNaN(userId)) {
            return res.status(401).json({ 
              message: 'Invalid token' 
            });
          }

          const user = mockUsers.find(u => u.id === userId);
          
          if (!user) {
            return res.status(401).json({ 
              message: 'User not found' 
            });
          }

          return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          });
        }
        break;

      default:
        return res.status(405).json({ 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
