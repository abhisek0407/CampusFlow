import mongoose from 'mongoose';

const WindowSchema = new mongoose.Schema({
  day: { type: String, required: true },
  from_period: { type: Number, required: true },
  to_period: { type: Number, required: true },
}, { _id: false });

const BookingRequestSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "BR-01"
  submitted_at: { type: String, required: true },
  requester: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'department_coordinator', 'faculty', 'club'],
  },
  requested_category: {
    type: String,
    required: true,
    enum: ['institute_event', 'guest_lecture', 'department_event', 'club_event'],
  },
  title: { type: String, required: true },
  attendance: { type: Number, required: true },
  duration_periods: { type: Number, required: true },
  windows: [WindowSchema],
  room_types: [{ type: String, required: true }],
  needs: [{ type: String }],
  requested_room: { type: String, default: null },
  mandatory_for_groups: [{ type: String }],
  series_id: { type: String, default: null },
  raw_text: { type: String, default: '' },

  // Application-specific lifecycle tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'alternative_offered', 'cancelled'],
    default: 'pending',
  },
  decision_reason: { type: String, default: null },
  assigned_room: { type: String, default: null },
  assigned_day: { type: String, default: null },
  assigned_start_period: { type: Number, default: null },
  assigned_end_period: { type: Number, default: null },
  reviewed_by: { type: String, default: null },
  reviewed_at: { type: Date, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.BookingRequest || mongoose.model('BookingRequest', BookingRequestSchema);
