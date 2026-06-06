const AuditLog = require('../models/AuditLog');

const logAction = async ({ action, performedBy, targetId, targetModel, details, ipAddress }) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetId,
      targetModel,
      details,
      ipAddress: ipAddress || 'unknown',
    });
  } catch (error) {
    // Never let audit logging break the main flow
    console.error('⚠️  Audit log error:', error.message);
  }
};

module.exports = { logAction };
