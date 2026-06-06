const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, unique: true },
    dateTime: { type: Date, required: [true, 'Date and time is required'], default: Date.now },
    department: { type: String, required: [true, 'Department is required'] },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Critical', 'Minor', 'Major'],
    },
    severity: {
      type: String,
      required: [true, 'Severity is required'],
      enum: ['Critical', 'High', 'Medium', 'Low'],
    },
    reportedBy: { type: String, required: [true, 'Reported by is required'] },
    reportedByPhone: { type: String, default: '' },
    peopleInvolved: [{ type: String }],
    description: { type: String, required: [true, 'Description is required'] },
    brief: { type: String, default: '' },
    event: { type: String, default: '' },
    impact: { type: String, default: '' },
    investigationCategory: { type: String, default: '' },
    rootCause: { type: String, default: '' },
    immediateAction: { type: String, default: '' },
    dateReporting: { type: Date, default: null },
    dateFormReceived: { type: Date, default: null },
    actionTaken: { type: String, default: '' },
    responsiblePerson: { type: String, default: '' },
    capa: { type: String, default: '' },
    managementResponse: { type: String, default: '' },
    sensitizationDone: { type: Boolean, default: false },
    sensitizationDetails: { type: String, default: '' },
    noticesIssued: { type: Boolean, default: false },
    noticeDetails: { type: String, default: '' },
    currentPhase: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    checklist: {
      incidentLogged: { type: Boolean, default: true },
      detailsRecorded: { type: Boolean, default: true },
      immediateActionsDocumented: { type: Boolean, default: false },
      
      peopleInvolvedRecorded: { type: Boolean, default: false },
      responsiblePersonAssigned: { type: Boolean, default: false },
      capaFormulated: { type: Boolean, default: false },
      dashboardUpdated: { type: Boolean, default: false },
      
      managementResponseRecorded: { type: Boolean, default: false },
      noticesIssuedChecked: { type: Boolean, default: false },
      sensitizationDoneChecked: { type: Boolean, default: false },
      reviewerRemarksAdded: { type: Boolean, default: false },
      
      resolutionDetailsRecorded: { type: Boolean, default: false },
      incidentClosed: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Pending'],
      default: 'Open',
    },
    resolutionDate: { type: Date, default: null },
    remarks: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // New fields mapped from paper form
    dateOfEvent: { type: Date, default: null },
    timeOfEvent: { type: String, default: '' },
    dateOfReporting: { type: Date, default: null },
    timeOfReporting: { type: String, default: '' },
    identifiedBy: { type: String, default: '' },
    reportedBySign: { type: String, default: '' },
    reportedByDate: { type: Date, default: null },
    reportedByTime: { type: String, default: '' },
    personAffected: { type: String, default: '' },
    probableReason: { type: String, default: '' },
    rootCauses: [{ type: String }],
    impacts: [{ type: String }],
    reviewSopChecked: { type: Boolean, default: false },
    reviewSopDetails: { type: String, default: '' },
    reviewTrainingChecked: { type: Boolean, default: false },
    reviewTrainingDetails: { type: String, default: '' },
    reviewDisciplinaryChecked: { type: Boolean, default: false },
    reviewDisciplinaryDetails: { type: String, default: '' },
    reviewInfrastructureChecked: { type: Boolean, default: false },
    reviewInfrastructureDetails: { type: String, default: '' },
    sensitisationRequired: [{ type: String }],
    analysedByName: { type: String, default: '' },
    analysedBySign: { type: String, default: '' },
    analysedByDate: { type: Date, default: null },
    analysedByTime: { type: String, default: '' },
    reviewedByName: { type: String, default: '' },
    reviewedBySign: { type: String, default: '' },
    reviewedByDate: { type: Date, default: null },
    reviewedByTime: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate incident ID and sync combined fields before saving
incidentSchema.pre('save', async function (next) {
  if (this.isNew && !this.incidentId) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.incidentId = `INC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // Sync dateTime if dateOfEvent is set
  if (this.dateOfEvent) {
    const combined = new Date(this.dateOfEvent);
    if (this.timeOfEvent) {
      const [hours, minutes] = this.timeOfEvent.split(':');
      if (hours !== undefined && minutes !== undefined) {
        combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
    }
    this.dateTime = combined;
  }

  // Sync dateReporting if dateOfReporting is set
  if (this.dateOfReporting) {
    const combined = new Date(this.dateOfReporting);
    if (this.timeOfReporting) {
      const [hours, minutes] = this.timeOfReporting.split(':');
      if (hours !== undefined && minutes !== undefined) {
        combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
    }
    this.dateReporting = combined;
  }

  next();
});

// Index for faster queries
incidentSchema.index({ department: 1, status: 1, severity: 1, dateTime: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
