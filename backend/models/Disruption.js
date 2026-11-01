import mongoose from 'mongoose';

const DisruptionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "DISRUPTION001"
  title: { type: String, required: true },
  source: { type: String, default: 'admin' },
  requested_by: { type: String, default: null },
  base_version: { type: Number, default: 1 },
  changes: [{ type: mongoose.Schema.Types.Mixed, required: true }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'analyzed', 'approved', 'rejected', 'applied'],
    default: 'pending',
  },
  baseline_schedule_id: { type: String, default: 'SCHEDULE_CURRENT' },
  proposed_schedule_id: { type: String, default: null },
  proposal: { type: mongoose.Schema.Types.Mixed, default: null },
  stability_metrics: {
    sessions_moved: { type: Number, default: 0 },
    time_changed: { type: Number, default: 0 },
    room_only_changed: { type: Number, default: 0 },
    moved_ids: [{ type: String }],
  },
  approved_by: { type: String, default: null },
  applied_version: { type: Number, default: null }, // live timetable version created when approved
  decision_reason: { type: String, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Disruption || mongoose.model('Disruption', DisruptionSchema, 'disruptions');