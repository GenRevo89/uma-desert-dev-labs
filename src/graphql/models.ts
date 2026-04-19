import mongoose, { Schema } from 'mongoose';

const SensorSchema = new Schema({
  type: { type: String, required: true },
  status: { type: String, default: 'Active' },
  addedAt: { type: Date, default: Date.now }
});

const TelemetrySchema = new Schema({
  type: { type: String, required: true }, // e.g. "pH Spike", "Temp Spike"
  value: { type: Number, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const Sensor = mongoose.models.Sensor || mongoose.model('Sensor', SensorSchema);
export const Telemetry = mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);

const TeamWorkerSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['Agronomist', 'Technician', 'Harvester', 'Manager'], required: true },
  email: { type: String, required: true },
});

const WorkOrderSchema = new Schema({
  workOrderId: { type: String, required: true, unique: true, index: true }, // WO-XXXXXX
  type: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: String, default: null },
  assignedEmail: { type: String, default: null },
  towerId: { type: String, default: null }, // Which tower this relates to (T1-T5)
  status: { type: String, enum: ['open', 'completed', 'verified', 'escalated'], default: 'open' },
  // Completion data (filled by worker terminal)
  workerNotes: { type: String, default: null },
  resolution: { type: String, enum: ['resolved', 'mitigated', 'escalated', 'false_alarm', null], default: null },
  timeSpent: { type: Number, default: null }, // minutes
  // Review tracking
  reviewed: { type: Boolean, default: false },
  reviewResult: { type: String, default: null }, // Uma's review summary
  // Reminder tracking
  lastReminderSentAt: { type: Date, default: null },
  reminderCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const TeamWorkerModel = mongoose.models.TeamWorker || mongoose.model('TeamWorker', TeamWorkerSchema);
export const WorkOrderModel = mongoose.models.WorkOrder || mongoose.model('WorkOrder', WorkOrderSchema);

const TwinProjectSchema = new Schema({
  name: { type: String, required: true },
  thumbnailSvg: { type: String, default: null },
  isDemo: { type: Boolean, default: false },
  components: { type: [Schema.Types.Mixed], default: [] },
  pipes: { type: [Schema.Types.Mixed], default: [] },
  updatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const TwinProjectModel = mongoose.models.TwinProject || mongoose.model('TwinProject', TwinProjectSchema);
