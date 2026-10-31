import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "LOG001"
  user_id: { type: String, required: true },
  action: { type: String, required: true },
  entity_type: { type: String, required: true },
  entity_id: { type: String, default: null },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
  _id: false,
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema, 'audit_logs');
