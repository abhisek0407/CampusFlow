import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "USER001"
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'department_coordinator', 'faculty', 'club'],
  },
  department: { type: String, default: 'COMMON' },
  linked_faculty_id: { type: String, default: null },
  is_active: { type: Boolean, default: true },
  reset_password_token: { type: String, default: null },
  reset_password_expires: { type: Date, default: null },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
