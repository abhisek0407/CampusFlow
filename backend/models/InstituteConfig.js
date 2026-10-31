import mongoose from 'mongoose';

const InstituteConfigSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "cit-public-v1"
  dataset_id: { type: String, required: true },
  institute: { type: String, required: true },
  calendar: { type: mongoose.Schema.Types.Mixed, required: true },
  priority_order: [{ type: String }],
  role_category_cap: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.InstituteConfig || mongoose.model('InstituteConfig', InstituteConfigSchema);
