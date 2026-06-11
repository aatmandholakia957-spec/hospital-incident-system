const Incident = require('../models/Incident');
const ExcelJS = require('exceljs');
const { logAction } = require('../utils/auditLogger');

// @desc    Export incidents to Excel
// @route   GET /api/export/excel
// @access  Private (admin, dept_head)
exports.exportExcel = async (req, res, next) => {
  try {
    const { department, severity, status, dateFrom, dateTo, category } = req.query;

    const query = { isDeleted: false };
    if (req.user.role === 'dept_head') query.department = req.user.department;
    else if (department) query.department = department;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (category) query.category = category;
    if (dateFrom || dateTo) {
      query.dateTime = {};
      if (dateFrom) query.dateTime.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.dateTime.$lte = end;
      }
    }

    const incidents = await Incident.find(query).sort({ dateTime: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hospital Incident Management System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Incidents Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { tabColor: { argb: 'FF0F2D5E' } },
    });

    // Column definitions
    sheet.columns = [
      { header: 'Incident ID', key: 'incidentId', width: 16 },
      { header: 'Date & Time', key: 'dateTime', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Reported By', key: 'reportedBy', width: 22 },
      { header: 'Description', key: 'description', width: 45 },
      { header: 'Action Taken', key: 'actionTaken', width: 38 },
      { header: 'Responsible Person', key: 'responsiblePerson', width: 22 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Resolution Date', key: 'resolutionDate', width: 18 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Header row style
    const headerRow = sheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2D5E' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: false },
        border: {
          bottom: { style: 'medium', color: { argb: 'FF00B4D8' } },
        },
      };
    });

    const severityColors = {
      Critical: { bg: 'FFDC2626', fg: 'FFFFFFFF' },
      High: { bg: 'FFEA580C', fg: 'FFFFFFFF' },
      Medium: { bg: 'FFCA8A04', fg: 'FFFFFFFF' },
      Low: { bg: 'FF16A34A', fg: 'FFFFFFFF' },
    };

    const statusColors = {
      Open: 'FFDBEAFE',
      Pending: 'FFFEF3C7',
      Closed: 'FFD1FAE5',
    };

    incidents.forEach((incident, index) => {
      const row = sheet.addRow({
        incidentId: incident.incidentId || '',
        dateTime: incident.dateTime ? new Date(incident.dateTime).toLocaleString('en-IN') : '',
        department: incident.department || '',
        category: incident.category || '',
        severity: incident.severity || '',
        reportedBy: incident.reportedBy || '',
        description: incident.description || '',
        actionTaken: incident.actionTaken || '',
        responsiblePerson: incident.responsiblePerson || '',
        status: incident.status || '',
        resolutionDate: incident.resolutionDate ? new Date(incident.resolutionDate).toLocaleDateString('en-IN') : '',
        remarks: incident.remarks || '',
      });

      const bgColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
          alignment: { wrapText: true, vertical: 'top' },
          font: { name: 'Calibri', size: 10 },
          border: {
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          },
        };
      });

      // Severity badge
      const sc = severityColors[incident.severity];
      if (sc) {
        const sCell = row.getCell('severity');
        sCell.style = {
          ...sCell.style,
          font: { bold: true, color: { argb: sc.fg }, size: 10, name: 'Calibri' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } },
          alignment: { horizontal: 'center', vertical: 'top' },
        };
      }

      // Status badge
      const stColor = statusColors[incident.status];
      if (stColor) {
        const stCell = row.getCell('status');
        stCell.style = {
          ...stCell.style,
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: stColor } },
          alignment: { horizontal: 'center', vertical: 'top' },
        };
      }

      row.height = 40;
    });

    // Add summary row at top
    sheet.insertRow(1, []);
    const titleRow = sheet.getRow(1);
    titleRow.height = 40;
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Hospital Incident Management Report — Generated ${new Date().toLocaleString('en-IN')} — Total: ${incidents.length} incidents`;
    titleCell.style = {
      font: { bold: true, size: 13, color: { argb: 'FF0F2D5E' }, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    await logAction({
      action: 'EXPORT_EXCEL',
      performedBy: req.user._id,
      details: { count: incidents.length, filters: req.query },
      ipAddress: req.ip,
    });

    const filename = `hospital_incidents_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
