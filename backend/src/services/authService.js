const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    async register(data) {
        const { username, password, role, fullName, salary } = data;

        const existingUser = await userRepository.findUserByUsername(username);
        if (existingUser) {
            throw new Error('Username already taken');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await userRepository.createUser({
            username,
            password: hashedPassword,
            role: role || 'cashier',
            fullName: fullName || '',
            salary: salary ? parseFloat(salary) : 0.00
        });

        return user;
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

        await userRepository.updateLastLogin(user.id);

        const payload = { id: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

        return { token, role: user.role };
    }
}

module.exports = new AuthService();
