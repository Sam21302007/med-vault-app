const mongoose = require('mongoose');

const BedSchema = new mongoose.Schema({
  bed_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    enum: ['ICU', 'Emergency', 'General Ward', 'VIP Suite', 'Pediatrics', 'Surgical Ward'],
  },
  room_number: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance'],
    default: 'Available',
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  daily_rate: {
    type: Number,
    required: true,
    default: 1500,
  },
  admitted_at: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Bed', BedSchema);
