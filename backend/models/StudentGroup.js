import mongoose from 'mongoose';

const StudentGroupSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "Y1-A", "Y2-CSE"
  name: { type: String, required: true },
  year: { type: Number, required: true },
  department: { type: String, required: true },
  size: { type: Number, required: true },
  needs_accessible: { type: Boolean, default: false },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.StudentGroup || mongoose.model('StudentGroup', StudentGroupSchema);
