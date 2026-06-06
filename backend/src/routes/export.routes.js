const express = require('express');
const router = express.Router();
const { exportExcel } = require('../controllers/export.controller');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/excel', protect, requireRole('admin', 'dept_head'), exportExcel);

module.exports = router;
