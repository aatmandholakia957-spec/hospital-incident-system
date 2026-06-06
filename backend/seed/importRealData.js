const dns = require('dns');
if (dns.setServers) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ExcelJS = require('exceljs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Incident = require('../src/models/Incident');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const TrainingLog = require('../src/models/TrainingLog');

// Valid values for enum validations
const VALID_DEPARTMENTS = [
  'HK', 'Maintenance', 'Canteen', 'OPD', 'Reception', 'OT',
  'IPD', 'IPD-MA', 'HR', 'Finance & Billing', 'Accounting',
  'Telecaller', 'Pharmacy', 'Marketing', 'Quality', 'MRD'
];
const VALID_CATEGORIES = ['Critical', 'Minor', 'Major'];
const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const VALID_STATUSES = ['Open', 'Closed', 'Pending'];

// Find the excel file
function findExcelFile() {
  // 1. Check command line arguments
  if (process.argv[2] && !process.argv[2].startsWith('--')) {
    const customPath = path.resolve(process.argv[2]);
    if (fs.existsSync(customPath)) return customPath;
  }

  // 2. Check project root
  const rootPath = path.join(__dirname, '../../incidents.xlsx');
  if (fs.existsSync(rootPath)) return rootPath;

  // 3. Check backend root
  const backendPath = path.join(__dirname, '../incidents.xlsx');
  if (fs.existsSync(backendPath)) return backendPath;

  // 4. Check seed directory
  const seedPath = path.join(__dirname, './incidents.xlsx');
  if (fs.existsSync(seedPath)) return seedPath;

  return null;
}

// Helper to normalize string matching (trim, lowercase, remove special characters)
function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parse yes/no, true/false into boolean
function parseBool(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  const cleaned = cleanStr(val);
  return ['yes', 'true', '1', 'y', 't'].includes(cleaned);
}

// Convert value to date or null
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    // ExcelJS parses some DD/MM/YYYY dates as MM/DD/YYYY when day <= 12.
    // For this dataset, all incidents occurred in May 2026 (Month = 5).
    // The day of the parsed Date object is 5 (representing May), and the month is the actual day.
    const originalDay = val.getDate();
    const originalMonth = val.getMonth(); // 0-indexed
    const year = val.getFullYear();
    
    // Check if it matches the swapped format (where the parsed day of the month is 5, representing May)
    if (originalDay === 5) {
      return new Date(year, 4, originalMonth + 1, val.getHours(), val.getMinutes(), val.getSeconds());
    }
    return val;
  }
  const str = String(val).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// Normalize departments to standard list
function normalizeDepartment(val) {
  const clean = cleanStr(val);
  if (clean.startsWith('opd')) return 'OPD';
  if (clean.startsWith('ipd')) return 'IPD';
  if (clean.includes('reception')) return 'Reception';
  if (clean.includes('maintenance') || clean.includes('facility')) return 'Maintenance';
  if (clean.includes('account') || clean.includes('finance')) return 'Accounting';
  if (clean.includes('billing')) return 'Finance & Billing';
  if (clean.includes('pharmacy')) return 'Pharmacy';
  if (clean.includes('canteen')) return 'Canteen';
  if (clean.includes('ot')) return 'OT';
  if (clean.includes('hr')) return 'HR';
  if (clean.includes('telecaller')) return 'Telecaller';
  if (clean.includes('marketing')) return 'Marketing';
  if (clean.includes('quality')) return 'Quality';
  if (clean.includes('mrd')) return 'MRD';
  if (clean.includes('hk') || clean.includes('housekeeping')) return 'HK';
  return 'Quality'; // Default fallback
}


async function run() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('--------------------------------------------------');
  console.log(dryRun ? '🔍 Running in DRY RUN mode (no database changes)' : '🚀 Starting actual data migration...');
  console.log('--------------------------------------------------');

  const excelPath = findExcelFile();
  if (!excelPath) {
    console.error('❌ Error: Could not find "incidents.xlsx".');
    console.error('Please download your Excel file from OneDrive and save it as "incidents.xlsx" in:');
    console.error(` 👉 ${path.join(__dirname, '../../incidents.xlsx')}`);
    process.exit(1);
  }

  console.log(`📂 Excel file found at: ${excelPath}`);

  // Connect to database
  await connectDB();

  // Find a default creator user (Admin) to assign as createdBy
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.error('❌ Error: No Admin user found in the database. Please run the seed command (npm run seed) first to initialize system operators.');
    process.exit(1);
  }
  console.log(`👤 Using user "${adminUser.name}" (${adminUser.email}) as the creator for imported incidents.`);

  // Load workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  // Use the first worksheet
  const worksheet = workbook.worksheets[0];
  console.log(`📖 Reading worksheet: "${worksheet.name}"`);

  // Detect columns based on headers
  const headers = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNum) => {
    headers[colNum] = {
      name: cell.value ? String(cell.value).trim() : '',
      index: colNum
    };
  });

  // Map header indexes to schema fields
  const colMap = {};
  headers.forEach((h, idx) => {
    const cleanedName = cleanStr(h.name);
    
    if (cleanedName.includes('incidenceno')) colMap.incidentId = idx;
    else if (cleanedName.includes('dateofincidence')) colMap.dateTime = idx;
    else if (cleanedName.includes('dateofreportinginfir')) colMap.dateReporting = idx;
    else if (cleanedName.includes('incedenceformreceivedondate')) colMap.dateFormReceived = idx;
    else if (cleanedName.includes('department')) colMap.department = idx;
    else if (cleanedName.includes('briefoftheincident')) colMap.brief = idx;
    else if (cleanedName.includes('descriptionoftheincident')) colMap.description = idx;
    else if (cleanedName === 'event') colMap.event = idx;
    else if (cleanedName.includes('impacton')) colMap.impact = idx;
    else if (cleanedName.includes('criticalmajorminor')) {
      colMap.category = idx;
      colMap.severity = idx;
    }
    else if (cleanedName.includes('investigationcategory')) colMap.investigationCategory = idx;
    else if (cleanedName.includes('rootcauseanalysis')) colMap.rootCause = idx;
    else if (cleanedName.includes('immediateactontaken')) colMap.immediateAction = idx;
    else if (cleanedName.includes('furtheractiontakentopreventrecurrence')) colMap.actionTaken = idx;
    else if (cleanedName.includes('tatforcompletionofcapa')) colMap.capa = idx;
    else if (cleanedName === 'personresponsible') colMap.responsiblePerson = idx;
    else if (cleanedName.includes('auditdone')) colMap.auditDone = idx;
    
    else if (cleanedName.includes('reportedbyphone') || (cleanedName.includes('phone') && cleanedName.includes('report'))) colMap.reportedByPhone = idx;
    else if (cleanedName.includes('phone') || cleanedName.includes('contact') || cleanedName.includes('mobile')) colMap.reportedByPhone = idx;
    else if (cleanedName.includes('reportedby') || cleanedName.includes('reporter')) colMap.reportedBy = idx;
    else if (cleanedName.includes('peopleinvolved') || cleanedName.includes('involved') || cleanedName.includes('witness')) colMap.peopleInvolved = idx;
    else if (cleanedName.includes('managementresponse') || cleanedName.includes('management')) colMap.managementResponse = idx;
    
    else if (cleanedName.includes('sensitizationdetails')) colMap.sensitizationDetails = idx;
    else if (cleanedName.includes('sensitization')) colMap.sensitizationDone = idx;
    else if (cleanedName.includes('noticedetails') || cleanedName.includes('noticedetail')) colMap.noticeDetails = idx;
    else if (cleanedName.includes('notice') || cleanedName.includes('advisory')) colMap.noticesIssued = idx;
    
    else if (cleanedName.includes('status')) colMap.status = idx;
    else if (cleanedName.includes('resolutiondate') || cleanedName.includes('closeddate')) colMap.resolutionDate = idx;
    else if (cleanedName.includes('remarks') || cleanedName.includes('comments') || cleanedName.includes('remark')) colMap.remarks = idx;
  });

  console.log('\n🗺️ Detected Column Mapping:');
  Object.keys(colMap).forEach((field) => {
    console.log(`   - ${field} => Column ${colMap[field]} ("${headers[colMap[field]].name}")`);
  });

  // Critical checks
  const missingCritical = [];
  if (!colMap.department) missingCritical.push('Department');
  if (!colMap.description) missingCritical.push('Description');
  if (!colMap.reportedBy) missingCritical.push('Reported By');
  if (!colMap.category) missingCritical.push('Category');
  if (!colMap.severity) missingCritical.push('Severity');

  if (missingCritical.length > 0) {
    console.warn(`\n⚠️ Warning: Missing mapped columns for critical fields: ${missingCritical.join(', ')}.`);
    console.warn('The script will try to parse but some required fields may be empty or use default values.\n');
  }

  const parsedIncidents = [];
  let rowCount = 0;
  let warnCount = 0;

  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (rowNumber === 1) return;

    // Check if row is empty
    let hasValue = false;
    row.eachCell((cell) => {
      if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
        hasValue = true;
      }
    });
    if (!hasValue) return;

    rowCount++;

    const getValue = (field) => {
      const colIndex = colMap[field];
      if (!colIndex) return undefined;
      const cell = row.getCell(colIndex);
      return cell.value;
    };

    // Skip trailing blank rows
    if (!String(getValue('description') || '').trim() && !String(getValue('department') || '').trim()) {
      return;
    }

    // 1. DateTime
    let rawDate = getValue('dateTime');
    let dateTime = parseDate(rawDate);
    if (!dateTime) {
      dateTime = new Date();
      console.warn(`Row ${rowNumber}: Could not parse date "${rawDate}". Defaulting to current date.`);
      warnCount++;
    }

    // 1.5 Incident ID parsing
    const rawIncNo = String(getValue('incidentId') || '').trim();
    let incidentId = undefined;
    if (rawIncNo) {
      const parts = rawIncNo.split('/');
      if (parts.length >= 4) {
        const year = `20${parts[2]}`;
        const num = parts[3].padStart(4, '0');
        incidentId = `INC-${year}-${num}`;
      } else {
        incidentId = rawIncNo;
      }
    }

    // 2. Department validation & mapping
    let department = String(getValue('department') || '').trim();
    if (!department) {
      department = 'Quality';
      console.warn(`Row ${rowNumber}: Department is empty. Defaulting to "Quality".`);
      warnCount++;
    } else {
      department = normalizeDepartment(department);
    }

    // 3. Category validation & normalization
    let category = String(getValue('category') || '').trim().toUpperCase();
    if (category.includes('CRITICAL')) category = 'Critical';
    else if (category.includes('MAJOR')) category = 'Major';
    else if (category.includes('MINOR')) category = 'Minor';
    else {
      console.warn(`Row ${rowNumber}: Invalid category "${category}". Defaulting to "Minor".`);
      category = 'Minor';
      warnCount++;
    }

    // 4. Severity validation & normalization
    let severity = String(getValue('severity') || '').trim().toUpperCase();
    if (severity.includes('CRITICAL')) severity = 'Critical';
    else if (severity.includes('MAJOR')) severity = 'High';
    else if (severity.includes('MINOR')) severity = 'Low';
    else {
      severity = 'Medium';
    }

    // 5. Reported By
    let reportedBy = String(getValue('reportedBy') || '').trim();
    if (!reportedBy) {
      reportedBy = 'Viroc Quality Team';
    }
    const reportedByPhone = String(getValue('reportedByPhone') || '').trim();

    // 6. People Involved
    const rawPeople = getValue('peopleInvolved');
    let peopleInvolved = [];
    if (rawPeople) {
      if (Array.isArray(rawPeople)) {
        peopleInvolved = rawPeople.map(p => String(p).trim());
      } else {
        peopleInvolved = String(rawPeople).split(/[,;]/).map(p => p.trim()).filter(Boolean);
      }
    }

    // 7. Description
    const description = String(getValue('description') || 'Imported incident data').trim();

    // 8. Action Taken
    const actionTaken = String(getValue('actionTaken') || '').trim();

    // 9. Responsible Person
    const responsiblePerson = String(getValue('responsiblePerson') || '').trim();

    // 10. CAPA
    const capa = String(getValue('capa') || '').trim();

    // 11. Management Response
    const managementResponse = String(getValue('managementResponse') || '').trim();

    // 12. Sensitization
    const sensitizationDone = parseBool(getValue('sensitizationDone'));
    const sensitizationDetails = String(getValue('sensitizationDetails') || '').trim();

    // 13. Notices
    const noticesIssued = parseBool(getValue('noticesIssued'));
    const noticeDetails = String(getValue('noticeDetails') || '').trim();

    // 14. Status
    let status = String(getValue('status') || '').trim();
    const auditDone = parseBool(getValue('auditDone'));
    if (auditDone) {
      status = 'Closed';
    }
    if (status) {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
    if (!VALID_STATUSES.includes(status)) {
      status = actionTaken || responsiblePerson ? 'Pending' : 'Open';
      if (status === 'Closed' && !actionTaken) status = 'Pending';
    }

    // 15. Resolution Date
    const resolutionDate = parseDate(getValue('resolutionDate'));

    // 16. Remarks
    const remarks = String(getValue('remarks') || '').trim();

    // 17. New fields from Excel columns
    const brief = String(getValue('brief') || '').trim();
    const event = String(getValue('event') || '').trim();
    const impact = String(getValue('impact') || '').trim();
    const investigationCategory = String(getValue('investigationCategory') || '').trim();
    const rootCause = String(getValue('rootCause') || '').trim();
    const immediateAction = String(getValue('immediateAction') || '').trim();
    const dateReporting = parseDate(getValue('dateReporting'));
    const dateFormReceived = parseDate(getValue('dateFormReceived'));

    // Workflow phases calculation based on data fields
    let currentPhase = 1;
    if (status === 'Closed') {
      currentPhase = 4;
    } else if (status === 'Pending') {
      currentPhase = 3;
    } else if (actionTaken || responsiblePerson || capa || immediateAction) {
      currentPhase = 2;
    }

    // Generate standard workflow checklist
    const checklist = {
      incidentLogged: true,
      detailsRecorded: true,
      immediateActionsDocumented: !!immediateAction || !!actionTaken,
      peopleInvolvedRecorded: peopleInvolved.length > 0,
      responsiblePersonAssigned: !!responsiblePerson,
      capaFormulated: !!capa,
      dashboardUpdated: currentPhase >= 2,
      managementResponseRecorded: !!managementResponse,
      noticesIssuedChecked: noticesIssued,
      sensitizationDoneChecked: sensitizationDone,
      reviewerRemarksAdded: !!remarks,
      resolutionDetailsRecorded: currentPhase === 4,
      incidentClosed: status === 'Closed'
    };

    parsedIncidents.push({
      incidentId,
      dateTime,
      department,
      category,
      severity,
      reportedBy,
      reportedByPhone,
      peopleInvolved,
      description,
      brief,
      event,
      impact,
      investigationCategory,
      rootCause,
      immediateAction,
      dateReporting,
      dateFormReceived,
      actionTaken,
      responsiblePerson,
      capa,
      managementResponse,
      sensitizationDone,
      sensitizationDetails,
      noticesIssued,
      noticeDetails,
      currentPhase,
      checklist,
      status,
      resolutionDate,
      remarks,
      createdBy: adminUser._id,
      isDeleted: false
    });
  });
  console.log(`\n📋 Successfully parsed ${rowCount} rows from Excel.`);
  console.log(`⚠️  Total validation warnings: ${warnCount}`);

  // Parse Sheet 2 (TRAINNIG OF INCIDENCE)
  const parsedTrainingLogs = [];
  try {
    const trainingSheet = workbook.worksheets[1];
    if (trainingSheet) {
      console.log(`📖 Reading training worksheet: "${trainingSheet.name}"`);
      trainingSheet.eachRow((row, rowNumber) => {
        if (rowNumber < 4) return; // Skip headers
        
        const getValueAt = (colNum) => {
          const cell = row.getCell(colNum);
          return cell.value ? String(cell.value).trim() : '';
        };

        // Check if row is empty
        let hasValue = false;
        row.eachCell((cell) => {
          if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
            hasValue = true;
          }
        });
        if (!hasValue) return;

        const srNo = parseInt(getValueAt(1), 10) || (parsedTrainingLogs.length + 1);

        parsedTrainingLogs.push({
          srNo,
          trainingDepartment: getValueAt(2),
          incharge: getValueAt(3),
          topic: getValueAt(4),
          sensitizationDepartment: getValueAt(6),
          person: getValueAt(7),
          reason: getValueAt(8),
          decisionDepartment: getValueAt(10),
          action: getValueAt(11),
          month: 'May 2026'
        });
      });
      console.log(`📋 Successfully parsed ${parsedTrainingLogs.length} training logs from Excel.`);
    } else {
      console.warn('⚠️  Could not find training worksheet at index 1.');
    }
  } catch (err) {
    console.warn('⚠️  Error parsing training sheet:', err.message);
  }

  // Save parsed incidents to local JSON seed file for local in-memory fallback
  try {
    fs.writeFileSync(
      path.join(__dirname, 'realIncidents.json'),
      JSON.stringify(parsedIncidents, null, 2)
    );
    console.log('📝 Saved parsed incidents to backend/seed/realIncidents.json for local fallback.');
  } catch (err) {
    console.warn('⚠️ Could not save realIncidents.json:', err.message);
  }

  // Save parsed training logs to local JSON seed file
  try {
    fs.writeFileSync(
      path.join(__dirname, 'realTrainingLogs.json'),
      JSON.stringify(parsedTrainingLogs, null, 2)
    );
    console.log('📝 Saved parsed training logs to backend/seed/realTrainingLogs.json.');
  } catch (err) {
    console.warn('⚠️ Could not save realTrainingLogs.json:', err.message);
  }

  if (dryRun) {
    console.log('\n🔍 [Dry Run] Parsed Incidents Sample (First 2 items):');
    console.log(JSON.stringify(parsedIncidents.slice(0, 2), null, 2));
    console.log('\n🔍 [Dry Run] Parsed Training Logs Sample (First 2 items):');
    console.log(JSON.stringify(parsedTrainingLogs.slice(0, 2), null, 2));
    console.log('\n✅ Dry run completed. No changes were made to the database.');
    process.exit(0);
  }

  // Database Execution
  try {
    console.log('\n🗑️  Clearing mock database collections (Incidents, Notifications, AuditLogs, TrainingLogs)...');
    await Promise.all([
      Incident.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      TrainingLog.deleteMany({})
    ]);
    console.log('✅  Collections cleared.');

    console.log(`\n📥 Importing ${parsedIncidents.length} incidents into database...`);
    
    // We save each to trigger the pre-save hook (which generates INC-YYYY-XXXX auto incidentIds)
    const savedIncidents = [];
    for (let i = 0; i < parsedIncidents.length; i++) {
      const inc = new Incident(parsedIncidents[i]);
      if (!inc.incidentId) {
        const year = new Date(inc.dateTime).getFullYear();
        inc.incidentId = `INC-${year}-${String(i + 1).padStart(4, '0')}`;
      }
      await inc.save();
      savedIncidents.push(inc);
    }
    
    console.log(`✅  Successfully imported ${savedIncidents.length} incidents.`);

    console.log(`\n📥 Importing ${parsedTrainingLogs.length} training logs into database...`);
    await TrainingLog.insertMany(parsedTrainingLogs);
    console.log(`✅  Successfully imported ${parsedTrainingLogs.length} training logs.`);

    // Create system import notification and audit log
    const notification = new Notification({
      title: 'Database Migrated Successfully',
      message: `Database was cleared of mock data and populated with ${savedIncidents.length} real incidents from Excel.`,
      type: 'status_change',
      forRoles: ['admin'],
      isRead: false
    });
    await notification.save();

    const auditLog = new AuditLog({
      action: 'DELETE_INCIDENT',
      performedBy: adminUser._id,
      details: { count: savedIncidents.length, source: path.basename(excelPath), description: 'System data reset and Excel import' },
      ipAddress: '127.0.0.1'
    });
    await auditLog.save();
    console.log('📝 Logged import event in Audit Logs.');

    console.log('\n🎉 Real database import completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Critical execution error:', err);
  process.exit(1);
});
