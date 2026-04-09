const express = require('express');
const router = express.Router();
const giveawayController = require('../controllers/giveawayController');
const { protect } = require('../middleware/authMiddleware');

// All giveaway routes protected by auth
router.use(protect);

// Create Giveaway
router.post('/', giveawayController.createGiveaway);

// Get All Giveaways
router.get('/', giveawayController.getAllGiveaways);

// Get Single Giveaway
router.get('/:id', giveawayController.getGiveawayById);

// Participate in Giveaway
router.post('/:id/participate', giveawayController.participateInGiveaway);

// Select Winners (Admin only)
router.post('/:id/select-winners', giveawayController.selectWinners);

// Get User's Giveaway History
router.get('/my-history', giveawayController.getUserGiveawayHistory);

// Delete Giveaway (Admin or creator only)
router.delete('/:id', giveawayController.deleteGiveaway);

module.exports = router;
