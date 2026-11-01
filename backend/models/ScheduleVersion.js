import mongoose from 'mongoose';

const ChangeRecordSchema = new mongoose.Schema({
  session_id: { type: String, required: true },
  old: {
    day: { type: String },
    start_period: { type: Number },
    room_id: { type: String },
  },
  new: {
    day: { type: String },
    start_period: { type: Number },
    room_id: { type: String },
  },
}, { _id: false });

const ScheduleVersionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "VERSION001"
  schedule_id: { type: String, required: true, ref: 'Schedule' },
  version: { type: Number, required: true },
  previous_version: { type: Number, required: true },
  changes: [ChangeRecordSchema],
  sessions_moved: { type: Number, default: 0 },
  approved_by: { type: String, default: null },
  disruption_id: { type: String, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.ScheduleVersion || mongoose.model('ScheduleVersion', ScheduleVersionSchema, 'schedule_versions');
