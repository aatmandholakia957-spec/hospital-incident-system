const express = require('express');
const router = express.Router();
const {
  getIncidents, getIncident, createIncident,
  updateIncident, updateStatus, deleteIncident,
  getReminders, markAudited, markReaudited,
} = require('../controllers/incidents.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', protect, getIncidents);
router.get('/reminders', protect, getReminders);
router.get('/:id', protect, getIncident);
router.post('/', protect, requireRole('admin', 'dept_head', 'staff'), createIncident);
router.put('/:id', protect, requireRole('admin', 'dept_head'), updateIncident);
router.patch('/:id/status', protect, requireRole('admin', 'dept_head'), updateStatus);
router.patch('/:id/audit', protect, requireRole('admin', 'dept_head'), markAudited);
router.patch('/:id/reaudit', protect, requireRole('admin', 'dept_head'), markReaudited);
router.delete('/:id', protect, requireRole('admin'), deleteIncident);

module.exports = router;
