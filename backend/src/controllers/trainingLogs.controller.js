const TrainingLog = require('../models/TrainingLog');

// @desc    Get all training logs
// @route   GET /api/training-logs
// @access  Private
exports.getTrainingLogs = async (req, res, next) => {
  try {
    const trainingLogs = await TrainingLog.find().sort({ srNo: 1 });
    res.json({
      success: true,
      data: trainingLogs,
    });
  } catch (error) {
    next(error);
  }
};
