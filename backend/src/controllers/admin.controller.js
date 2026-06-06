const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../utils/auditLogger');
const { paginate } = require('../utils/paginate');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (admin)
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    await logAction({
      action: 'CREATE_USER',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      details: { email: user.email, role: user.role, department: user.department },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: user, message: 'User created successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private (admin)
exports.updateUser = async (req, res, next) => {
  try {
    // Prevent password update through this route
    delete req.body.password;

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await logAction({
      action: 'UPDATE_USER',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      details: { changes: req.body },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: user, message: 'User updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;

    const query = {};
    if (action) query.action = action;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('performedBy', 'name email role'),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: paginate(total, pageNum, limitNum),
    });
  } catch (error) {
    next(error);
  }
};
