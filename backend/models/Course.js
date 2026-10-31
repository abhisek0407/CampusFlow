import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "MA101"
  title: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: Number, required: true },
  lecture_hours: { type: Number, default: 0 },
  tutorial_hours: { type: Number, default: 0 },
  lab_blocks: { type: Number, default: 0 },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
