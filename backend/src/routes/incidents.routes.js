const express = require('express');
const router = express.Router();
const {
  getIncidents, getIncident, createIncident,
  updateIncident, updateStatus, deleteIncident,
} = require('../controllers/incidents.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', protect, getIncidents);
router.get('/:id', protect, getIncident);
router.post('/', protect, requireRole('admin', 'dept_head', 'staff'), createIncident);
router.put('/:id', protect, requireRole('admin', 'dept_head'), updateIncident);
router.patch('/:id/status', protect, requireRole('admin', 'dept_head'), updateStatus);
router.delete('/:id', protect, requireRole('admin'), deleteIncident);

module.exports = router;
