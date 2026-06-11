const Incident = require('../models/Incident');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/auditLogger');
const { paginate } = require('../utils/paginate');
const { sendSMS } = require('../utils/smsSender');

// Helper to check if CAPA closure is blocked
const checkCapaClosureBlock = (incident, updateBody) => {
  const status = updateBody.status !== undefined ? updateBody.status : incident.status;
  const currentPhase = updateBody.currentPhase !== undefined ? Number(updateBody.currentPhase) : incident.currentPhase;

  if (status === 'Closed' || currentPhase === 4) {
    const cas = updateBody.correctiveActions !== undefined ? updateBody.correctiveActions : incident.correctiveActions;
    const pas = updateBody.preventiveActions !== undefined ? updateBody.preventiveActions : incident.preventiveActions;
    const bypass = updateBody.capaBypassApproved !== undefined ? updateBody.capaBypassApproved : incident.capaBypassApproved;

    const allActions = [...(cas || []), ...(pas || [])];
    const hasPendingMandatory = allActions.some(a => a.isMandatory && a.status !== 'Completed');

    if (hasPendingMandatory && !bypass) {
      return {
        isBlocked: true,
        message: 'Cannot close incident. There are pending mandatory Corrective or Preventive Actions (CAPA) that are not Completed. Management override is required.'
      };
    }
  }
  return { isBlocked: false };
};


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

    const incident = await Incident.findOne(query);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    // Check CAPA closure block
    const blockCheck = checkCapaClosureBlock(incident, req.body);
    if (blockCheck.isBlocked) {
      return res.status(400).json({ success: false, message: blockCheck.message });
    }

    // Now update fields
    Object.keys(req.body).forEach(key => {
      incident[key] = req.body[key];
    });
    incident.updatedBy = req.user._id;

    await incident.save();

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

    const query = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incident = await Incident.findOne(query);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const updateData = {
      status,
      updatedBy: req.user._id,
    };

    if (remarks) updateData.remarks = remarks;
    if (status === 'Closed') updateData.resolutionDate = new Date();

    // Check CAPA closure block
    const blockCheck = checkCapaClosureBlock(incident, updateData);
    if (blockCheck.isBlocked) {
      return res.status(400).json({ success: false, message: blockCheck.message });
    }

    // Now update
    Object.keys(updateData).forEach(key => {
      incident[key] = updateData[key];
    });

    await incident.save();

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

// @desc    Get active and upcoming audit/reaudit reminders
// @route   GET /api/incidents/reminders
// @access  Private
exports.getReminders = async (req, res, next) => {
  try {
    const query = {
      isDeleted: false,
      status: 'Closed',
      resolutionDate: { $exists: true, $ne: null },
      $or: [
        { auditDone: false },
        { reauditDone: false }
      ]
    };

    // Dept heads only see their own department's reminders
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incidents = await Incident.find(query, 'incidentId department resolutionDate auditDone reauditDone');
    
    const reminders = [];
    const now = new Date();

    incidents.forEach((inc) => {
      const resDate = new Date(inc.resolutionDate);
      
      if (!inc.auditDone) {
        // 1st Audit: due 30 days after resolutionDate
        const dueDate = new Date(resDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        reminders.push({
          _id: inc._id,
          incidentId: inc.incidentId,
          department: inc.department,
          resolutionDate: inc.resolutionDate,
          type: '1st Audit',
          dueDate: dueDate,
          isOverdue: now >= dueDate,
        });
      } else if (!inc.reauditDone) {
        // 2nd Audit (Reaudit): due 60 days after resolutionDate
        const dueDate = new Date(resDate.getTime() + 60 * 24 * 60 * 60 * 1000);
        reminders.push({
          _id: inc._id,
          incidentId: inc.incidentId,
          department: inc.department,
          resolutionDate: inc.resolutionDate,
          type: '2nd Re-Audit',
          dueDate: dueDate,
          isOverdue: now >= dueDate,
        });
      }
    });

    // Sort: overdue first, then by due date ascending
    reminders.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.dueDate - b.dueDate;
    });

    res.json({ success: true, data: reminders });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark the 1st audit as completed
// @route   PATCH /api/incidents/:id/audit
// @access  Private (admin, dept_head)
exports.markAudited = async (req, res, next) => {
  try {
    const query = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incident = await Incident.findOne(query);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    incident.auditDone = true;
    incident.auditDate = new Date();
    incident.updatedBy = req.user._id;
    await incident.save();

    await logAction({
      action: 'AUDIT_INCIDENT',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId, type: '1st Audit' },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: incident, message: '1st Audit marked as completed successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark the 2nd re-audit as completed
// @route   PATCH /api/incidents/:id/reaudit
// @access  Private (admin, dept_head)
exports.markReaudited = async (req, res, next) => {
  try {
    const query = { _id: req.params.id, isDeleted: false };
    if (req.user.role === 'dept_head') {
      query.department = req.user.department;
    }

    const incident = await Incident.findOne(query);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    if (!incident.auditDone) {
      return res.status(400).json({ success: false, message: 'Cannot complete 2nd Re-Audit before the 1st Audit is finished.' });
    }

    incident.reauditDone = true;
    incident.reauditDate = new Date();
    incident.updatedBy = req.user._id;
    await incident.save();

    await logAction({
      action: 'REAUDIT_INCIDENT',
      performedBy: req.user._id,
      targetId: incident._id,
      targetModel: 'Incident',
      details: { incidentId: incident.incidentId, type: '2nd Re-Audit' },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: incident, message: '2nd Re-Audit marked as completed successfully.' });
  } catch (error) {
    next(error);
  }
};
