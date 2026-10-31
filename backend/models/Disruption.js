import mongoose from 'mongoose';

const DisruptionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "DISRUPTION001"
  title: { type: String, required: true },
  source: { type: String, default: 'admin' },
  changes: [{ type: mongoose.Schema.Types.Mixed, required: true }],
  status: {
    type: String,
    enum: ['pending', 'analyzed', 'approved', 'rejected', 'applied'],
    default: 'pending',
  },
  baseline_schedule_id: { type: String, default: null },
  proposed_schedule_id: { type: String, default: null },
  stability_metrics: {
    sessions_moved: { type: Number, default: 0 },
    time_changed: { type: Number, default: 0 },
    room_only_changed: { type: Number, default: 0 },
    moved_ids: [{ type: String }],
  },
  approved_by: { type: String, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Disruption || mongoose.model('Disruption', DisruptionSchema, 'disruptions');
