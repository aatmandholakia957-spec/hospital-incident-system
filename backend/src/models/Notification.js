const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['new_incident', 'status_change', 'critical_alert'],
      default: 'new_incident',
    },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    isRead: { type: Boolean, default: false },
    forRoles: [{ type: String, enum: ['admin', 'dept_head', 'staff', 'viewer'] }],
    forDepartment: { type: String, default: null },
    forUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
