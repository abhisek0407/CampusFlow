import mongoose from 'mongoose';

const UnavailableSlotSchema = new mongoose.Schema({
  day: { type: String, required: true },
  periods: [{ type: Number, required: true }],
  reason: { type: String, default: '' },
}, { _id: false });

const PreferenceSchema = new mongoose.Schema({
  type: { type: String, default: 'avoid' },
  days: [{ type: String }],
  periods: [{ type: Number }],
  note: { type: String, default: '' },
}, { _id: false });

const FacultySchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "F01"
  name: { type: String, required: true },
  department: { type: String, required: true },
  max_hours_per_day: { type: Number, default: 4 },
  needs_accessible: { type: Boolean, default: false },
  unavailable: [UnavailableSlotSchema],
  preferences: [PreferenceSchema],
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema, 'faculty');
