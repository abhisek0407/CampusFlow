import mongoose from 'mongoose';

const SessionAssignmentSchema = new mongoose.Schema({
  session_id: { type: String, required: true },
  day: { type: String, required: true },
  start_period: { type: Number, required: true },
  room_id: { type: String, required: true },
}, { _id: false });

const BookingDecisionSchema = new mongoose.Schema({
  request_id: { type: String, required: true },
  status: { type: String, required: true, enum: ['approved', 'rejected', 'alternative_offered'] },
  day: { type: String },
  start_period: { type: Number },
  end_period: { type: Number },
  room_id: { type: String },
  reason: { type: String, default: '' },
}, { _id: false });

const SessionOverrideSchema = new mongoose.Schema({
  session_id: { type: String, required: true },
  day: { type: String, required: true },
  start_period: { type: Number, required: true },
  room_id: { type: String, required: true },
  displaced_by: { type: String, required: true },
}, { _id: false });

const ExamAssignmentSchema = new mongoose.Schema({
  exam_id: { type: String, required: true },
  day: { type: String, required: true },
  session: { type: String, required: true, enum: ['AM', 'PM'] },
  rooms: [{ type: String, required: true }],
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "SCHEDULE001"
  team: { type: String, default: 'OrchestrAI' },
  dataset_id: { type: String, required: true },
  version: { type: Number, default: 1 },
  status: { type: String, default: 'approved', enum: ['draft', 'generated', 'approved', 'superseded'] },
  sessions: [SessionAssignmentSchema],
  fest_week: {
    bookings: [BookingDecisionSchema],
    session_overrides: [SessionOverrideSchema],
  },
  exams: [ExamAssignmentSchema],
  approved_by: { type: String, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
