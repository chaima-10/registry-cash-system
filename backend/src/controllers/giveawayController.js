const giveawayService = require('../services/giveawayService');

// Create Giveaway
exports.createGiveaway = async (req, res) => {
    try {
        const giveaway = await giveawayService.createGiveaway(req.body, req.user.id);
        res.status(201).json(giveaway);
    } catch (error) {
        console.error('Error creating giveaway:', error);
        if (['Title and end date are required', 'End date must be in the future', 'Winner count must be between 1 and 100'].includes(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating giveaway', error: error.message });
    }
};

// Get All Giveaways
exports.getAllGiveaways = async (req, res) => {
    try {
        const giveaways = await giveawayService.getAllGiveaways();
        res.json(giveaways);
    } catch (error) {
        console.error('Error fetching giveaways:', error);
        res.status(500).json({ message: 'Error fetching giveaways', error: error.message });
    }
};

// Get Single Giveaway
exports.getGiveawayById = async (req, res) => {
    try {
        const giveaway = await giveawayService.getGiveawayById(parseInt(req.params.id));
        res.json(giveaway);
    } catch (error) {
        console.error('Error fetching giveaway:', error);
        if (error.message === 'Giveaway not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching giveaway', error: error.message });
    }
};

// Participate in Giveaway
exports.participateInGiveaway = async (req, res) => {
    try {
        const participation = await giveawayService.participateInGiveaway(
            parseInt(req.params.id), 
            req.user.id, 
            req.user.role, 
            req.body
        );
        res.status(201).json({ message: 'Successfully participated in giveaway', participation });
    } catch (error) {
        console.error('Error participating in giveaway:', error);
        if (error.message === 'Giveaway not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Only cashiers can register participants for giveaways') {
            return res.status(403).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

// Select Winners (Random Selection)
exports.selectWinners = async (req, res) => {
    try {
        const result = await giveawayService.selectWinners(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('Error selecting winners:', error);
        if (error.message === 'Giveaway not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
};

// Get User's Giveaway History
exports.getUserGiveawayHistory = async (req, res) => {
    try {
        const history = await giveawayService.getUserGiveawayHistory(req.user.id);
        res.json(history);
    } catch (error) {
        console.error('Error fetching user giveaway history:', error);
        res.status(500).json({ message: 'Error fetching giveaway history', error: error.message });
    }
};

// Delete Giveaway (Admin only)
exports.deleteGiveaway = async (req, res) => {
    try {
        await giveawayService.deleteGiveaway(parseInt(req.params.id), req.user.id, req.user.role);
        res.json({ message: 'Giveaway deleted successfully' });
    } catch (error) {
        console.error('Error deleting giveaway:', error);
        if (error.message === 'Giveaway not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Not authorized to delete this giveaway') {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error deleting giveaway', error: error.message });
    }
};
