import mongoose from 'mongoose';

const RoomUnavailabilitySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  room_id: { type: String, required: true, ref: 'Room' },
  day: { type: String, required: true },
  periods: [{ type: Number, required: true }],
  reason: { type: String, default: '' },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.RoomUnavailability || mongoose.model('RoomUnavailability', RoomUnavailabilitySchema);
