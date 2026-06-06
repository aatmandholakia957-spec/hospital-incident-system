const express = require('express');
const router = express.Router();
const { getTrainingLogs } = require('../controllers/trainingLogs.controller');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTrainingLogs);

module.exports = router;
