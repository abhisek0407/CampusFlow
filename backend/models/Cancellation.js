import mongoose from 'mongoose';

const CancellationSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "BR-04" or unique ID
  request_id: { type: String, required: true, ref: 'BookingRequest' },
  cancelled_at: { type: String, required: true },
  by: { type: String, required: true },
  note: { type: String, default: '' },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.Cancellation || mongoose.model('Cancellation', CancellationSchema);
