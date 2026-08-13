const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  day_of_week: {
    type: Number, // 0 = Sunday, 1 = Monday, etc.
    min: 0,
    max: 6,
    required: true,
  },
  start_time: {
    type: String, // e.g. "09:00"
    default: '09:00',
  },
  end_time: {
    type: String, // e.g. "17:00"
    default: '17:00',
  },
  slot_duration_minutes: {
    type: Number,
    default: 30,
  },
});

// Set compound unique index so a doctor has only one availability record per day
AvailabilitySchema.index({ doctor_id: 1, day_of_week: 1 }, { unique: true });

module.exports = mongoose.model('Availability', AvailabilitySchema);
