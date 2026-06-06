const express = require('express');
const router = express.Router();
const { getSummary, getByDepartment, getBySeverity, getTrends, getByCategory, getResolutionTime, getByPhase } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/summary', protect, getSummary);
router.get('/by-department', protect, getByDepartment);
router.get('/by-severity', protect, getBySeverity);
router.get('/by-phase', protect, getByPhase);
router.get('/trends', protect, getTrends);
router.get('/by-category', protect, getByCategory);
router.get('/resolution-time', protect, requireRole('admin', 'dept_head'), getResolutionTime);

module.exports = router;
