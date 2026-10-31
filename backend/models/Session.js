import mongoose from 'mongoose';

const FixedSlotSchema = new mongoose.Schema({
  day: { type: String, required: true },
  start_period: { type: Number, required: true },
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "MA101-AB-L1"
  course_id: { type: String, required: true, ref: 'Course' },
  kind: {
    type: String,
    required: true,
    enum: ['lecture', 'tutorial', 'lab'],
  },
  groups: [{ type: String, required: true, ref: 'StudentGroup' }],
  faculty_id: { type: String, required: true, ref: 'Faculty' },
  size: { type: Number, required: true },
  duration: { type: Number, required: true }, // 1 or 3
  room_types: [{ type: String, required: true }],
  needs_accessible: { type: Boolean, default: false },
  basket_slot: { type: String, default: null }, // e.g. "OEB-1"
  fixed_slot: { type: FixedSlotSchema, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
