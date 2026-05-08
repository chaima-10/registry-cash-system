const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/my-history', protect, attendanceController.getMyHistory);
router.get('/all', protect, admin, attendanceController.getAllHistory);
router.post('/clock-in', protect, attendanceController.clockIn);
router.post('/clock-out', protect, attendanceController.clockOut);
router.post('/trigger-check', protect, admin, attendanceController.triggerCheck);

module.exports = router;
