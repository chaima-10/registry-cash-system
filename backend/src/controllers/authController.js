const authService = require('../services/authService');
const userService = require('../services/userService');

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

// Get current user profile (using userService for richness/stats)
exports.getProfile = async (req, res) => {
    try {
        const profile = await userService.getProfileWithStats(req.user.id);
        res.json(profile);
    } catch (error) {
        console.error("getProfile Error:", error);
        if (error.message === 'User not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user profile (using userService for consistency)
exports.updateProfile = async (req, res) => {
    try {
        const updatedUser = await userService.updateProfile(req.user.id, req.body, req.file);
        res.json({ 
            message: 'Profil mis à jour avec succès.', 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        if (error.message === 'User not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Username already taken' || error.message === 'Email already in use') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
