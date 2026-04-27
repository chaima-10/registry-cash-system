const userService = require('../services/userService');

// Get all users (with current month stats and today's revenue)
exports.getAllUsers = async (req, res) => {
    try {
        const usersWithStats = await userService.getAllUsersStats();
        res.json(usersWithStats);
    } catch (error) {
        console.error("Aggregation Error in getAllUsers:", error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des statistiques.',
            error: error.message 
        });
    }
};

// Get current user profile (with stats)
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

// Distribute prime to all active users
exports.distributePrime = async (req, res) => {
    try {
        const result = await userService.distributePrime(req.user.id, req.body.amount, req.body.reason);
        res.status(result.message.includes('Aucun') ? 200 : 200).json(result);
    } catch (error) {
        console.error("Distribute Prime Error:", error);
        if (error.message.includes('Seul un administrateur')) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes('montant valide')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la distribution.', error: error.message });
    }
};

// Update current user profile
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

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await userService.changePassword(req.user.id, currentPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        if (error.message === 'User not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Incorrect current password') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const user = await userService.updateUser(parseInt(req.params.id), req.body);
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        await userService.deleteUser(parseInt(req.params.id));
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        if (error.message === 'Cannot delete the only administrator.') {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
