const mongoose = require('mongoose');

const trainingLogSchema = new mongoose.Schema(
  {
    srNo: { type: Number },
    trainingDepartment: { type: String, default: '' },
    incharge: { type: String, default: '' },
    topic: { type: String, default: '' },
    sensitizationDepartment: { type: String, default: '' },
    person: { type: String, default: '' },
    reason: { type: String, default: '' },
    decisionDepartment: { type: String, default: '' },
    action: { type: String, default: '' },
    month: { type: String, default: 'May 2026' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainingLog', trainingLogSchema);
