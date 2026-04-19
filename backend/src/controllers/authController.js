const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');

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

        // Check for Email Verification (Bypassed for admin to resolve lockout)
        if (user.email && !user.isEmailVerified && user.username.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Veuillez vérifier votre adresse e-mail avant de vous connecter.' });
        }

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

// Verify Email
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ message: 'Token manquant' });
        }

        const user = await prisma.user.findFirst({
            where: { emailVerificationToken: token }
        });

        if (!user) {
            return res.status(400).json({ message: 'Lien de vérification invalide ou expiré' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                email: user.pendingEmail,
                pendingEmail: null,
                emailVerificationToken: null,
                isEmailVerified: true
            }
        });

        res.json({ message: 'E-mail vérifié avec succès ! Vous pouvez maintenant utiliser cette adresse pour vous connecter.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Resend Verification Email
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'E-mail requis' });

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { pendingEmail: email }
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (user.email === email && user.isEmailVerified) {
            return res.status(400).json({ message: 'Cet e-mail est déjà vérifié' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const targetEmail = user.pendingEmail || user.email;

        await prisma.user.update({
            where: { id: user.id },
            data: { 
                emailVerificationToken: token,
                pendingEmail: targetEmail // Ensure it's in pending if it wasn't
            }
        });

        await emailService.sendVerificationEmail(targetEmail, token);
        res.json({ message: 'Lien de vérification renvoyé ! Veuillez consulter votre boîte mail.' });
    } catch (error) {
        console.error('Resend Verification Error:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
        const { fullName, email, phone } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        let emailUpdateMsg = "";
        let pendingEmail = undefined;
        let verificationToken = undefined;

        // Handle Email Update with Verification
        if (email && email !== user.email) {
            // Check if email already taken
            const existingEmailUser = await prisma.user.findFirst({
                where: {
                    email,
                    isEmailVerified: true,
                    NOT: { id: userId }
                }
            });
            if (existingEmailUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            verificationToken = crypto.randomBytes(32).toString('hex');
            pendingEmail = email;
            
            await emailService.sendVerificationEmail(email, verificationToken);
            emailUpdateMsg = " Un e-mail de confirmation a été envoyé à votre nouvelle adresse.";
        }

        const updateData = {
            fullName,
            phone
        };

        if (pendingEmail) {
            updateData.pendingEmail = pendingEmail;
            updateData.emailVerificationToken = verificationToken;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        const { password, ...userWithoutPassword } = updatedUser;
        res.json({ 
            message: 'Profil mis à jour avec succès.' + emailUpdateMsg, 
            user: userWithoutPassword 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
