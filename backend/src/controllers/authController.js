const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Enforce Single Admin Rule
        if (role === 'admin') {
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount > 0) {
                return res.status(403).json({ message: 'Operation failed. An administrator already exists.' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'cashier',
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create Token
        const payload = { id: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

        res.json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Logout user (Client-side clear, but valid endpoint for testing)
exports.logout = async (req, res) => {
    // Stateless JWT: We just return success. Client removes token.
    // Enhanced: Add token to a Redis blacklist if strict security is needed.
    res.json({ message: 'Logged out successfully' });
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Exclude password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
