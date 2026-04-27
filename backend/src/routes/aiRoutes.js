const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

// Route is: POST /api/ai/chat
router.post('/chat', protect, aiController.chat);

module.exports = router;
