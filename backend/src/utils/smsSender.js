const { logAction } = require('./auditLogger');

/**
 * Simulates sending a direct SMS to the person who reported the incident
 * and registers a SEND_SMS audit log in the database.
 */
const sendSMS = async (incident, req) => {
  if (!incident.reportedByPhone) return;

  const message = `Hello ${incident.reportedBy}, your report (Ref: ${incident.incidentId}) has been logged in CareTrace HIMS. It is currently under review. Thank you for your feedback.`;

  console.log('\n========================================================');
  console.log('📱  [SMS SIMULATION OUTGOING]');
  console.log(`📱  Recipient:  ${incident.reportedBy}`);
  console.log(`📱  Phone:      ${incident.reportedByPhone}`);
  console.log(`💬  Message:    "${message}"`);
  console.log('========================================================\n');

  try {
    await logAction({
      action: 'SEND_SMS',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: {
        recipient: incident.reportedBy,
        phone: incident.reportedByPhone,
        message,
      },
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error('⚠️  Failed to audit SMS action:', error.message);
  }
};

module.exports = { sendSMS };
