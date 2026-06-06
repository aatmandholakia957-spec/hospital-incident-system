const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, getAuditLogs } = require('../controllers/admin.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/users', protect, requireRole('admin'), getUsers);
router.post('/users', protect, requireRole('admin'), createUser);
router.put('/users/:id', protect, requireRole('admin'), updateUser);
router.get('/audit-logs', protect, requireRole('admin'), getAuditLogs);

module.exports = router;
