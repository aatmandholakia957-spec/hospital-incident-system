const Incident = require('../models/Incident');

// @desc    Get summary counts
// @route   GET /api/analytics/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const baseQuery = { isDeleted: false };
    if (req.user.role === 'dept_head') baseQuery.department = req.user.department;

    const [total, open, closed, pending, critical] = await Promise.all([
      Incident.countDocuments(baseQuery),
      Incident.countDocuments({ ...baseQuery, status: 'Open' }),
      Incident.countDocuments({ ...baseQuery, status: 'Closed' }),
      Incident.countDocuments({ ...baseQuery, status: 'Pending' }),
      Incident.countDocuments({ ...baseQuery, severity: 'Critical', status: { $ne: 'Closed' } }),
    ]);

    res.json({ success: true, data: { total, open, closed, pending, critical } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get incidents by department
// @route   GET /api/analytics/by-department
// @access  Private
exports.getByDepartment = async (req, res, next) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    const data = await Incident.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({ department: d._id, total: d.total, open: d.open, closed: d.closed, pending: d.pending, critical: d.critical })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get incidents by severity
// @route   GET /api/analytics/by-severity
// @access  Private
exports.getBySeverity = async (req, res, next) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    const data = await Incident.aggregate([
      { $match: match },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data: data.map((d) => ({ severity: d._id, count: d.count })) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly trends
// @route   GET /api/analytics/trends
// @access  Private
exports.getTrends = async (req, res, next) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    // Last 12 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    match.dateTime = { $gte: startDate };

    const data = await Incident.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$dateTime' }, month: { $month: '$dateTime' } },
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
      success: true,
      data: data.map((d) => ({
        period: `${months[d._id.month - 1]} ${d._id.year}`,
        total: d.total,
        open: d.open,
        closed: d.closed,
        critical: d.critical,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get incidents by category
// @route   GET /api/analytics/by-category
// @access  Private
exports.getByCategory = async (req, res, next) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    const data = await Incident.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data: data.map((d) => ({ category: d._id, count: d.count })) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get average resolution time by department
// @route   GET /api/analytics/resolution-time
// @access  Private (admin, dept_head)
exports.getResolutionTime = async (req, res, next) => {
  try {
    const match = {
      isDeleted: false,
      status: 'Closed',
      resolutionDate: { $exists: true, $ne: null },
    };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    const data = await Incident.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$department',
          avgDays: {
            $avg: {
              $divide: [{ $subtract: ['$resolutionDate', '$dateTime'] }, 1000 * 60 * 60 * 24],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgDays: 1 } },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({
        department: d._id,
        avgDays: Math.round(d.avgDays * 10) / 10,
        count: d.count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get incidents by workflow phase
// @route   GET /api/analytics/by-phase
// @access  Private
exports.getByPhase = async (req, res, next) => {
  try {
    const match = { isDeleted: false };
    if (req.user.role === 'dept_head') match.department = req.user.department;

    const data = await Incident.aggregate([
      { $match: match },
      { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const phaseNames = {
      1: 'Phase 1: Entry',
      2: 'Phase 2: Fill-up',
      3: 'Phase 3: Review',
      4: 'Phase 4: Closure'
    };

    const result = [1, 2, 3, 4].map(phase => {
      const matchData = data.find(d => d._id === phase);
      return {
        phase,
        name: phaseNames[phase],
        count: matchData ? matchData.count : 0
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
