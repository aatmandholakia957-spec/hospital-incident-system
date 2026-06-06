const Notification = require('../models/Notification');

// Helper to scope notifications based on user ID, role, and department
const getScopeQuery = (user) => {
  const query = {
    $or: [
      { forUser: user._id },
    ],
  };

  if (user.role === 'admin') {
    query.$or.push({ forRoles: 'admin' });
  } else {
    query.$or.push({
      forRoles: user.role,
      $or: [
        { forDepartment: null },
        { forDepartment: user.department },
      ],
    });
  }

  return query;
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const query = getScopeQuery(req.user);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('incidentId', 'incidentId department category severity'),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    const query = { ...getScopeQuery(req.user), isRead: false };

    await Notification.updateMany(query, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger SLA lifecycle reminders manually
// @route   POST /api/notifications/run-reminders
// @access  Private (admin only)
exports.triggerReminders = async (req, res, next) => {
  try {
    const { runReminders } = require('../utils/reminderRunner');
    await runReminders();
    res.json({ success: true, message: 'Automated lifecycle phase checks executed.' });
  } catch (error) {
    next(error);
  }
};
