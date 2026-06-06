const Incident = require('../models/Incident');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Scans all open/pending incidents and sends targeted SLA status reminders
 * to responsible persons and admins.
 */
const runReminders = async () => {
  try {
    console.log('\n⏰  [SLA CHECK] Scanning active system incidents...');
    
    const incidents = await Incident.find({ status: { $ne: 'Closed' }, isDeleted: false });
    const now = new Date();
    let remindersSent = 0;

    for (const incident of incidents) {
      // Calculate elapsed hours
      const elapsedHours = Math.floor((now - incident.dateTime) / (1000 * 60 * 60));
      
      let reminderType = 'info';
      let title = `Reminder: Incident ${incident.incidentId} Phase`;
      let phaseName = incident.currentPhase === 4 ? 'Closure' :
                      incident.currentPhase === 3 ? 'Management Review' :
                      incident.currentPhase === 2 ? 'Data Fill-up' : 'Entry';
      
      let message = `Incident ${incident.incidentId} (${incident.department}) is in Phase ${incident.currentPhase}: ${phaseName}. Elapsed time: ${elapsedHours} hours.`;

      // Check SLA targets
      if (incident.currentPhase === 1 && elapsedHours >= 24) {
        reminderType = 'warning';
        title = `SLA Registration Warning: Incident ${incident.incidentId}`;
        message = `⚠️ SLA WARNING: Incident ${incident.incidentId} has not completed Phase 1 (Incident Entry) after ${elapsedHours} hours (Target: 24h).`;
      } else if (elapsedHours >= 48) {
        reminderType = 'critical_warning';
        title = `SLA Resolution Breach: Incident ${incident.incidentId}`;
        message = `🚨 SLA BREACH: Incident ${incident.incidentId} remains unresolved after ${elapsedHours} hours (Target: 48h).`;
      }

      // Look up if responsiblePerson is a registered user name
      let targetUserId = null;
      if (incident.responsiblePerson) {
        const userObj = await User.findOne({ name: incident.responsiblePerson });
        if (userObj) {
          targetUserId = userObj._id;
        }
      }

      // Create targeted notification
      await Notification.create({
        title,
        message,
        type: reminderType === 'info' ? 'new_incident' : 'critical_alert',
        incidentId: incident._id,
        forRoles: targetUserId ? [] : ['admin', 'dept_head'],
        forDepartment: targetUserId ? null : incident.department,
        forUser: targetUserId,
      });

      // Log simulated SMS reminder
      console.log(`✉️  [REMINDER SMS] To: ${incident.responsiblePerson || incident.department + ' Head'} | ${message}`);
      remindersSent++;
    }

    console.log(`✅  [SLA CHECK] Scans completed. Sent ${remindersSent} reminders.\n`);
  } catch (error) {
    console.error('⚠️  Lifecycle checker failed:', error.message);
  }
};

/**
 * Initializes the reminder scheduler to run on server startup and every 6 hours.
 */
const startReminderService = () => {
  // Delay first startup run by 5 seconds to ensure database connectivity
  setTimeout(runReminders, 5000);

  // Repeat checks every 6 hours
  setInterval(runReminders, 6 * 60 * 60 * 1000);
};

module.exports = { startReminderService, runReminders };
