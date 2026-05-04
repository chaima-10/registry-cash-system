const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('./emailService');

class AuthService {
    async register(data) {
        const { username, password, role, fullName, salary, email } = data;

        const existingUser = await userRepository.findUserByUsername(username);
        if (existingUser) {
            throw new Error('Username already taken');
        }

        if (email) {
            const existingEmail = await userRepository.findUserByEmail(email);
            if (existingEmail) {
                throw new Error('Email already in use');
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = await userRepository.createUser({
            username,
            password: hashedPassword,
            email: email || null,
            role: role || 'cashier',
            fullName: fullName || '',
            salary: salary ? parseFloat(salary) : 0.00,
            emailVerificationToken: verificationToken,
            isEmailVerified: false
        });

        // Send verification email if email is provided
        if (email) {
            try {
                await emailService.sendVerificationEmail(email, verificationToken);
            } catch (error) {
                console.error("Failed to send verification email:", error);
                // We don't throw here to allow user creation even if email fails, 
                // but in production you might want to handle this differently.
            }
        }

        return user;
    }

    async verifyEmail(token) {
        console.log("Tentative de vérification avec le jeton:", token);
        const user = await userRepository.findUserByVerificationToken(token);
        
        if (!user) {
            console.log("Aucun utilisateur trouvé pour ce jeton.");
            throw new Error('Jeton de vérification invalide ou expiré');
        }

        console.log("Utilisateur trouvé:", user.username);
        await userRepository.updateUser(user.id, {
            isEmailVerified: true,
            emailVerificationToken: null
        });

        return { message: 'Email vérifié avec succès' };
    }

    async forgotPassword(email) {
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new Error('Aucun utilisateur trouvé avec cet email');
        }

        // Generate a 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await userRepository.updateUser(user.id, {
            resetPasswordToken: resetCode,
            resetPasswordExpires: resetExpires
        });

        await emailService.sendPasswordResetEmail(email, resetCode);

        return { message: 'Code de réinitialisation envoyé par email' };
    }

    async resetPassword(email, code, newPassword) {
        const user = await userRepository.findUserByEmail(email);
        
        if (!user || user.resetPasswordToken !== code || new Date() > user.resetPasswordExpires) {
            throw new Error('Code invalide ou expiré');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await userRepository.updateUser(user.id, {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        return { message: 'Mot de passe réinitialisé avec succès' };
    }

    async login(email, username, password) {
        let user;
        if (email) {
            user = await userRepository.findUserByEmail(email);
        } else {
            user = await userRepository.findUserByUsername(username);
        }

        if (!user) {
            throw new Error('Identifiants invalides');
        }

        const isMatch = await bcrypt.compare(password.trim(), user.password);
        if (!isMatch) {
            throw new Error('Identifiants invalides');
        }

        // Optional: Check if email is verified before login
        // if (user.email && !user.isEmailVerified) {
        //     throw new Error('Veuillez vérifier votre email avant de vous connecter');
        // }

        await userRepository.updateLastLogin(user.id);

        const payload = { id: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

        return { token, role: user.role };
    }
}

module.exports = new AuthService();
