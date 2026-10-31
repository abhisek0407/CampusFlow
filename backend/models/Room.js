import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "AUD", "LH-1"
  name: { type: String, required: true },
  building: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'classroom',
      'lecture_hall',
      'auditorium',
      'seminar_hall',
      'outdoor',
      'lab_cs',
      'lab_elec',
      'lab_phy',
      'workshop',
      'lab_civil',
    ],
  },
  capacity: { type: Number, required: true },
  features: [{ type: String }],
  accessible: { type: Boolean, default: false },
  allowed_uses: [{ type: String }],
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
