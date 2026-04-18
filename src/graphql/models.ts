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
