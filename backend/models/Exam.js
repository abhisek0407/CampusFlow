import mongoose from 'mongoose';

const ExamSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "EX-MA101"
  course_ids: [{ type: String, required: true }],
  groups: [{ type: String, required: true, ref: 'StudentGroup' }],
  size: { type: Number, required: true },
  duration_hours: { type: Number, default: 2 },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
