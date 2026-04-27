const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = async (file) => {
    if (!file) return null;
    const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
        folder: 'profiles',
    });
    return uploadResponse.secure_url;
};


// Register a new user
exports.register = async (req, res) => {
    try {
        const { username, password, role, fullName, salary } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already taken' });
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
                fullName: fullName || '',
                salary: salary ? parseFloat(salary) : 0.00
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user (supports either username or email)
exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Find user by email OR username depending on what was provided
        let user;
        if (email) {
            user = await prisma.user.findFirst({ where: { email } });
        } else {
            user = await prisma.user.findUnique({ where: { username } });
        }

        if (!user) {
            return res.status(400).json({ message: 'Identifiants invalides' });
        }

        // Check for Email Verification (Removed)
        // We no longer block login for unverified emails.

        // Validate password
        const isMatch = await bcrypt.compare(password.trim(), user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Identifiants invalides' });
        }

        // Update lastLogin and add to Login History
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                lastLogin: new Date(),
                loginHistory: {
                    create: {}
                }
            }
        });

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

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone, age, username, theme } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updateData = {
            fullName: fullName !== undefined ? fullName : user.fullName,
            phone: phone !== undefined ? phone : user.phone,
            age: (age !== undefined && age !== '') ? parseInt(age) : (age === '' ? null : user.age),
            username: username !== undefined ? username : user.username,
            theme: theme !== undefined ? theme : user.theme
        };

        // Directly update email without verification flow
        if (email && email !== user.email) {
            // Check if email already taken
            const existingEmailUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId }
                }
            });
            if (existingEmailUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = email;
            updateData.isEmailVerified = true; // Auto-verify since feature is disabled
        }

        if (req.body.removeProfilePicture === 'true') {
            updateData.profilePicture = null;
        } else if (req.file) {
            updateData.profilePicture = await uploadToCloudinary(req.file);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        const { password, ...userWithoutPassword } = updatedUser;
        res.json({ 
            message: 'Profil mis à jour avec succès.', 
            user: userWithoutPassword 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
