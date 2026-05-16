const attendanceService = require('../services/attendanceService');

class AttendanceController {
    async getMyHistory(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 30;
            const history = await attendanceService.getHistory(userId, days);
            
            // Get today's record for status check
            const todayRecord = await attendanceService.getTodayRecord(userId);
            
            res.json({ history, today: todayRecord });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async clockIn(req, res) {
        try {
            const userId = req.user.id;
            const role = req.user.role;
            const record = await attendanceService.clockIn(userId, role);
            res.json(record);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async clockOut(req, res) {
        try {
            const userId = req.user.id;
            const record = await attendanceService.clockOut(userId);
            res.json(record);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllHistory(req, res) {
        try {
            // Admin only check (middleware should handle this, but for safety)
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const days = parseInt(req.query.days) || 30;
            const history = await attendanceService.getAllHistory(days);
            res.json(history);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async triggerCheck(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { date } = req.body;
            await attendanceService.runCheckForDate(date || new Date().toISOString());
            res.json({ message: 'Attendance check triggered successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new AttendanceController();
