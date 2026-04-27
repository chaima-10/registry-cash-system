const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const uploadService = require('../services/uploadService');

// Register a new user
exports.register = async (req, res) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        if (error.message === 'Username already taken') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const result = await authService.login(email, username, password);
        res.json(result);
    } catch (error) {
        if (error.message === 'Identifiants invalides') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Logout user
exports.logout = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// Get current user profile (authController version)
exports.getProfile = async (req, res) => {
    try {
        const user = await userRepository.findUserById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user profile (authController version)
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone, age, username, theme } = req.body;
        const userId = req.user.id;

        const user = await userRepository.findUserById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updateData = {
            fullName: fullName !== undefined ? fullName : user.fullName,
            phone: phone !== undefined ? phone : user.phone,
            age: (age !== undefined && age !== '') ? parseInt(age) : (age === '' ? null : user.age),
            username: username !== undefined ? username : user.username,
            theme: theme !== undefined ? theme : user.theme
        };

        if (email && email !== user.email) {
            const existingEmailUser = await userRepository.findUserByEmailNotId(email, userId);
            if (existingEmailUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = email;
            updateData.isEmailVerified = true;
        }

        if (req.body.removeProfilePicture === 'true') {
            updateData.profilePicture = null;
        } else if (req.file) {
            updateData.profilePicture = await uploadService.uploadImage(req.file, 'profiles');
        }

        const updatedUser = await userRepository.updateUser(userId, updateData);
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({ 
            message: 'Profil mis à jour avec succès.', 
            user: userWithoutPassword 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
