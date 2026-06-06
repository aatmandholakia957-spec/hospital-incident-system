const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllRead, triggerReminders } = require('../controllers/notifications.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', protect, getNotifications);
router.post('/run-reminders', protect, requireRole('admin'), triggerReminders);
router.patch('/read-all', protect, markAllRead);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
