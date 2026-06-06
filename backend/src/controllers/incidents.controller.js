const Incident = require('../models/Incident');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/auditLogger');
const { paginate } = require('../utils/paginate');
const { sendSMS } = require('../utils/smsSender');

// @desc    Get all incidents (with filters, search, pagination)
// @route   GET /api/incidents
// @access  Private
exports.getIncidents = async (req, res, next) => {
  try {
    const {
      department, severity, status, dateFrom, dateTo,
      search, page = 1, limit = 20, sortBy = 'dateTime', sortOrder = 'desc',
    } = req.query;

    const query = { isDeleted: false };

    // Dept heads only see their own department
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    } else if (department) {
      query.department = department;
    }

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (req.query.currentPhase) query.currentPhase = Number(req.query.currentPhase);

    if (dateFrom || dateTo) {
      query.dateTime = {};
      if (dateFrom) query.dateTime.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.dateTime.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { incidentId: { $regex: search, $options: 'i' } },
        { brief: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { event: { $regex: search, $options: 'i' } },
        { impact: { $regex: search, $options: 'i' } },
        { investigationCategory: { $regex: search, $options: 'i' } },
        { rootCause: { $regex: search, $options: 'i' } },
        { immediateAction: { $regex: search, $options: 'i' } },
        { reportedBy: { $regex: search, $options: 'i' } },
        { responsiblePerson: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [total, incidents] = await Promise.all([
      Incident.countDocuments(query),
      Incident.find(query)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
    ]);

    res.json({
      success: true,
      data: incidents,
      pagination: paginate(total, pageNum, limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Private
exports.getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, isDeleted: false })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    // Dept head access restriction
    if (req.user.role === 'dept_head' && incident.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view incidents from your department.' });
    }

    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new incident
// @route   POST /api/incidents
// @access  Private (admin, dept_head, staff)
exports.createIncident = async (req, res, next) => {
  try {
    const incident = await Incident.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Create notification for admins and dept heads
    const notifType = incident.severity === 'Critical' ? 'critical_alert' : 'new_incident';
    await Notification.create({
      title: `New ${incident.severity} Incident – ${incident.department}`,
      message: `${incident.category} reported by ${incident.reportedBy}: ${incident.description.substring(0, 120)}${incident.description.length > 120 ? '...' : ''}`,
      type: notifType,
      incidentId: incident._id,
      forRoles: ['admin', 'dept_head'],
      forDepartment: incident.department,
    });

    await logAction({
      action: 'CREATE_INCIDENT',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId, severity: incident.severity, department: incident.department },
      ipAddress: req.ip,
    });

    // Send simulated SMS confirmation to reporter
    if (incident.reportedByPhone) {
      await sendSMS(incident, req);
    }

    res.status(201).json({ success: true, data: incident, message: 'Incident reported successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update incident
// @route   PUT /api/incidents/:id
// @access  Private (admin, dept_head)
exports.updateIncident = async (req, res, next) => {
  try {
    // Remove protected fields
    delete req.body.incidentId;
    delete req.body.createdBy;
    delete req.body.isDeleted;

    const query = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incident = await Incident.findOneAndUpdate(
      query,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    await logAction({
      action: 'UPDATE_INCIDENT',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId, changes: req.body },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: incident, message: 'Incident updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update incident status only
// @route   PATCH /api/incidents/:id/status
// @access  Private (admin, dept_head)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!status || !['Open', 'Closed', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updateData = {
      status,
      updatedBy: req.user._id,
    };

    if (remarks) updateData.remarks = remarks;
    if (status === 'Closed') updateData.resolutionDate = new Date();

    const query = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incident = await Incident.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    await Notification.create({
      title: 'Incident Status Updated',
      message: `Incident ${incident.incidentId} (${incident.department}) has been marked as ${status}.`,
      type: 'status_change',
      incidentId: incident._id,
      forRoles: ['admin', 'dept_head'],
      forDepartment: incident.department,
    });

    await logAction({
      action: 'UPDATE_STATUS',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: incident, message: `Status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete incident
// @route   DELETE /api/incidents/:id
// @access  Private (admin only)
exports.deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, updatedBy: req.user._id },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    await logAction({
      action: 'DELETE_INCIDENT',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Incident archived successfully.' });
  } catch (error) {
    next(error);
  }
};
