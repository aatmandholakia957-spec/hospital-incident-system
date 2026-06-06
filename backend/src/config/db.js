const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const autoSeed = async () => {
  try {
    const User = require('../models/User');
    const Incident = require('../models/Incident');
    const Notification = require('../models/Notification');

    const count = await User.countDocuments();
    if (count > 0) return;

    console.log('🌱 Auto-seeding local in-memory database with 70 test incidents...');

    const usersData = [
      { name: 'Admin User', email: 'admin@hospital.com', password: 'admin123', role: 'admin', department: 'Administration', isActive: true },
      { name: 'Nurse Mike Chen', email: 'staff@hospital.com', password: 'staff123', role: 'staff', department: 'IPD', isActive: true },
      { name: 'Hospital Viewer', email: 'viewer@hospital.com', password: 'viewer123', role: 'viewer', department: 'Management', isActive: true },
      { name: 'Nurse Emma Wilson', email: 'emma@hospital.com', password: 'staff123', role: 'staff', department: 'OT', isActive: true },
      // Department Heads (16 Departments)
      { name: 'HK Head', email: 'hk@hospital.com', password: 'dept123', role: 'dept_head', department: 'HK', isActive: true },
      { name: 'Maintenance Head', email: 'maintenance@hospital.com', password: 'dept123', role: 'dept_head', department: 'Maintenance', isActive: true },
      { name: 'Canteen Head', email: 'canteen@hospital.com', password: 'dept123', role: 'dept_head', department: 'Canteen', isActive: true },
      { name: 'Dr. Sarah Johnson', email: 'depthead@hospital.com', password: 'dept123', role: 'dept_head', department: 'OPD', isActive: true },
      { name: 'Reception Head', email: 'reception@hospital.com', password: 'dept123', role: 'dept_head', department: 'Reception', isActive: true },
      { name: 'OT Head', email: 'ot@hospital.com', password: 'dept123', role: 'dept_head', department: 'OT', isActive: true },
      { name: 'Dr. Priya Patel', email: 'priya@hospital.com', password: 'dept123', role: 'dept_head', department: 'IPD', isActive: true },
      { name: 'IPD-MA Head', email: 'ipd-ma@hospital.com', password: 'dept123', role: 'dept_head', department: 'IPD-MA', isActive: true },
      { name: 'HR Head', email: 'hr@hospital.com', password: 'dept123', role: 'dept_head', department: 'HR', isActive: true },
      { name: 'Finance & Billing Head', email: 'finance@hospital.com', password: 'dept123', role: 'dept_head', department: 'Finance & Billing', isActive: true },
      { name: 'Accounting Head', email: 'accounting@hospital.com', password: 'dept123', role: 'dept_head', department: 'Accounting', isActive: true },
      { name: 'Telecaller Head', email: 'telecaller@hospital.com', password: 'dept123', role: 'dept_head', department: 'Telecaller', isActive: true },
      { name: 'Pharmacy Head', email: 'pharmacy@hospital.com', password: 'dept123', role: 'dept_head', department: 'Pharmacy', isActive: true },
      { name: 'Marketing Head', email: 'marketing@hospital.com', password: 'dept123', role: 'dept_head', department: 'Marketing', isActive: true },
      { name: 'Quality Head', email: 'quality@hospital.com', password: 'dept123', role: 'dept_head', department: 'Quality', isActive: true },
      { name: 'MRD Head', email: 'mrd@hospital.com', password: 'dept123', role: 'dept_head', department: 'MRD', isActive: true },
    ];

    const users = await User.create(usersData);
    console.log(`✅ Created ${users.length} test users`);

    const staffUsers = users.filter((u) => ['admin', 'dept_head', 'staff'].includes(u.role));

    const departments = [
      'HK', 'Maintenance', 'Canteen', 'OPD', 'Reception', 'OT',
      'IPD', 'IPD-MA', 'HR', 'Finance & Billing', 'Accounting',
      'Telecaller', 'Pharmacy', 'Marketing', 'Quality', 'MRD'
    ];
    const categories = ['Critical', 'Minor', 'Major'];
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const names = ['Dr. Sarah Johnson', 'Nurse Mike Chen', 'Dr. Priya Patel', 'Nurse Emma Wilson', 'Dr. Ahmed Hassan', 'Nurse Lisa Rodriguez', 'Dr. James Okafor', 'Nurse Anna Kim', 'Dr. Maria Santos', 'Nurse David Thompson'];

    const descriptionMap = {
      Critical: [
        'Critical life-safety event reported. Immediate medical intervention required.',
        'Severe patient handling incident resulting in critical injury.',
        'Systemic failure in ICU procedure resulting in critical event.'
      ],
      Minor: [
        'Minor patient fall reported. Patient examined and returned to bed safely.',
        'Minor documentation error noticed during routine record check.',
        'Minor facility damage or equipment malfunction.'
      ],
      Major: [
        'Major medical error identified. Patient stabilized and transferred.',
        'Major patient complaint filed regarding department operations.',
        'Major security breach or unauthorized entry in restriction zone.'
      ]
    };

    const actionMap = {
      Closed: [
        'Immediate assessment conducted. Incident report filed. Root cause identified and corrective action taken.',
        'Medical team notified. Patient examined and treatment administered successfully.',
        'Departmental review completed. Staff retraining ordered. Follow-up scheduled.',
        'Equipment quarantined and replacement arranged. Maintenance report filed.',
        'Patient and family informed. Formal apology given. Service recovery plan implemented.',
      ],
      Pending: [
        'Investigation ongoing. Preliminary report submitted to department head.',
        'Root cause analysis in progress. Awaiting full report from safety officer.',
      ],
      Open: [''],
    };

    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const fs = require('fs');
    const path = require('path');
    const realDataPath = path.join(__dirname, '../../seed/realIncidents.json');

    const createdIncidents = [];

    if (fs.existsSync(realDataPath)) {
      console.log('📝 Found real incidents seed file. Loading real data into local database...');
      const realData = JSON.parse(fs.readFileSync(realDataPath, 'utf8'));
      for (let i = 0; i < realData.length; i++) {
        const item = realData[i];
        item.createdBy = getRandom(staffUsers)._id;
        const incident = new Incident(item);
        if (!incident.incidentId) {
          const year = new Date(incident.dateTime).getFullYear();
          incident.incidentId = `INC-${year}-${String(i + 1).padStart(4, '0')}`;
        }
        await incident.save();
        createdIncidents.push(incident);
      }
      console.log(`✅ Loaded and created ${createdIncidents.length} real incidents from Excel seed!`);
      
      const realTrainingPath = path.join(__dirname, '../../seed/realTrainingLogs.json');
      if (fs.existsSync(realTrainingPath)) {
        console.log('📝 Found real training logs seed file. Loading into local database...');
        const TrainingLog = require('../models/TrainingLog');
        const realTrainingData = JSON.parse(fs.readFileSync(realTrainingPath, 'utf8'));
        await TrainingLog.insertMany(realTrainingData);
        console.log(`✅ Loaded and created ${realTrainingData.length} training logs from Excel seed!`);
      }
    } else {
      console.log('🌱 Generating mock simulated data...');
      const now = new Date();
      for (let i = 0; i < 70; i++) {
        const daysAgo = Math.floor(Math.random() * 365);
        const incidentDate = new Date(now);
        incidentDate.setDate(incidentDate.getDate() - daysAgo);

        const department = getRandom(departments);
        const category = getRandom(categories);
        const severity = getRandom(severities);

        const statusWeight = Math.random();
        const status = statusWeight < 0.45 ? 'Closed' : statusWeight < 0.7 ? 'Open' : 'Pending';

        let resolutionDate = null;
        if (status === 'Closed') {
          const daysToResolve = Math.floor(Math.random() * 14) + 1;
          resolutionDate = new Date(incidentDate);
          resolutionDate.setDate(resolutionDate.getDate() + daysToResolve);
        }

        const descriptions = descriptionMap[category];
        const description = getRandom(descriptions);
        const actions = actionMap[status];
        const actionTaken = getRandom(actions);

        // Seed workflow phases and checklists
        let currentPhase = 1;
        let capa = '';
        let managementResponse = '';
        let sensitizationDone = false;
        let sensitizationDetails = '';
        let noticesIssued = false;
        let noticeDetails = '';
        
        const checklist = {
          incidentLogged: true,
          detailsRecorded: true,
          immediateActionsDocumented: !!actionTaken,
          
          peopleInvolvedRecorded: false,
          responsiblePersonAssigned: false,
          capaFormulated: false,
          dashboardUpdated: false,
          
          managementResponseRecorded: false,
          noticesIssuedChecked: false,
          sensitizationDoneChecked: false,
          reviewerRemarksAdded: false,
          
          resolutionDetailsRecorded: false,
          incidentClosed: false,
        };

        if (status === 'Closed') {
          currentPhase = 4;
          capa = 'Full root cause analysis performed. Patient care protocol updated to prevent recurring errors. Staff training conducted.';
          managementResponse = 'Management reviewed the case. Approved CAPA measures and confirmed all corrective steps were executed.';
          sensitizationDone = true;
          sensitizationDetails = 'All nursing and clinical staff in the department were sensitized during the shift huddle on date-time protocols.';
          noticesIssued = true;
          noticeDetails = 'Issued a standard incident advisory notice to the department to reiterate standard operating procedures.';
          
          checklist.peopleInvolvedRecorded = true;
          checklist.responsiblePersonAssigned = true;
          checklist.capaFormulated = true;
          checklist.dashboardUpdated = true;
          checklist.managementResponseRecorded = true;
          checklist.noticesIssuedChecked = true;
          checklist.sensitizationDoneChecked = true;
          checklist.reviewerRemarksAdded = true;
          checklist.resolutionDetailsRecorded = true;
          checklist.incidentClosed = true;
        } else if (status === 'Pending') {
          currentPhase = 3;
          capa = 'Identified need for updated guidelines. Drafted preventive protocol for department head review.';
          managementResponse = 'Initial review completed. Awaiting sensitization compliance reports.';
          sensitizationDone = Math.random() > 0.5;
          sensitizationDetails = sensitizationDone ? 'Preliminary briefing conducted with the head nurse.' : '';
          noticesIssued = Math.random() > 0.5;
          noticeDetails = noticesIssued ? 'Request for statement issued to staff involved.' : '';
          
          checklist.peopleInvolvedRecorded = true;
          checklist.responsiblePersonAssigned = true;
          checklist.capaFormulated = true;
          checklist.dashboardUpdated = true;
          checklist.managementResponseRecorded = true;
          checklist.noticesIssuedChecked = noticesIssued;
          checklist.sensitizationDoneChecked = sensitizationDone;
          checklist.reviewerRemarksAdded = true;
        } else {
          // Open
          currentPhase = Math.random() > 0.5 ? 2 : 1;
          if (currentPhase === 2) {
            capa = Math.random() > 0.5 ? 'Interim supervision instituted while permanent CAPA is drafted.' : '';
            checklist.peopleInvolvedRecorded = true;
            checklist.responsiblePersonAssigned = true;
            checklist.capaFormulated = !!capa;
            checklist.dashboardUpdated = Math.random() > 0.5;
          }
        }

        const reportedByName = getRandom(names);
        const reportedByPhone = `+1 (555) 01${String(Math.floor(Math.random() * 90) + 10)}`;

        const incident = new Incident({
          dateTime: incidentDate,
          department,
          category,
          severity,
          reportedBy: reportedByName,
          reportedByPhone,
          peopleInvolved: [getRandom(names), getRandom(names)].filter((v, idx, a) => a.indexOf(v) === idx),
          description,
          actionTaken,
          responsiblePerson: getRandom(names),
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
          remarks: status === 'Closed' ? 'Incident resolved and documented. Follow-up completed.' : '',
          createdBy: getRandom(staffUsers)._id,
          isDeleted: false,
        });

        await incident.save();
        createdIncidents.push(incident);
      }
      console.log(`✅ Created ${createdIncidents.length} simulated incidents`);
    }

    const notifications = [
      {
        title: 'Critical Incident Alert – ICU',
        message: 'A new Critical severity incident has been reported in ICU. Immediate review required.',
        type: 'critical_alert',
        incidentId: createdIncidents[0]._id,
        forRoles: ['admin', 'dept_head'],
        isRead: false,
      },
      {
        title: 'New Incident – Emergency',
        message: 'A High severity Fall incident has been reported in Emergency department.',
        type: 'new_incident',
        incidentId: createdIncidents[1]._id,
        forRoles: ['admin', 'dept_head'],
        isRead: false,
      },
    ];
    await Notification.insertMany(notifications);
    console.log('🎉 In-memory database successfully initialized and seeded with 70 incidents!');
  } catch (err) {
    console.error('⚠️ Auto-seeding failed:', err.message);
  }
};

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    console.log('🔌 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hospital_incidents',
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦  Database: ${conn.connection.name}`);
  } catch (error) {
    console.warn(`⚠️  Atlas connection failed (${error.message}).`);
    console.warn('🚀 Spinning up local offline In-Memory MongoDB Server...');
    try {
      const path = require('path');
      const fs = require('fs');
      const dbPath = path.resolve(__dirname, '../../../local-db-data');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbPath: dbPath,
          storageEngine: 'wiredTiger',
        }
      });
      const localUri = mongoServer.getUri();
      console.log(`🔗 Local Persistent MongoDB connection string: ${localUri}`);
      const conn = await mongoose.connect(localUri, {
        dbName: 'hospital_incidents',
      });
      console.log(`✅  MongoDB Connected locally (Persistent Offline fallback)`);
      console.log(`📦  Database: ${conn.connection.name}`);
      await autoSeed();
    } catch (localError) {
      console.error(`❌  Local MongoDB setup failed: ${localError.message}`);
      process.exit(1);
    }
  }

  // Start background reminder service
  const { startReminderService } = require('../utils/reminderRunner');
  startReminderService();
};

module.exports = connectDB;
