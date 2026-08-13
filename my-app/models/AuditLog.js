const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  user_name: {
    type: String,
    default: 'System',
  },
  user_role: {
    type: String,
    default: 'system',
  },
  details: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['SECURITY', 'PATIENT', 'APPOINTMENT', 'BED', 'BILLING', 'PHARMACY', 'SYSTEM'],
    default: 'SYSTEM',
  },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
