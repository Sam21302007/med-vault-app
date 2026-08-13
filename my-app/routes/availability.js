const express = require('express');
const router = express.Router();
const Availability = require('../models/Availability');
const { protect } = require('./middleware');

// @route   GET /api/availability/:doctorId
// @desc    Get a doctor's availability
router.get('/:doctorId', protect, async (req, res) => {
  try {
    const list = await Availability.find({ doctor_id: req.params.doctorId }).sort('day_of_week');
    res.json(list);
  } catch (err) {
    console.error('Fetch availability error:', err);
    res.status(500).json({ message: 'Failed to retrieve availability' });
  }
});

// @route   POST /api/availability
// @desc    Update/Save availability (Doctors only)
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: Doctors only' });
  }

  const { availability } = req.body; // Array of { day_of_week, start_time, end_time, slot_duration_minutes }
  const doctor_id = req.user._id;

  try {
    // Delete existing settings first
    await Availability.deleteMany({ doctor_id });

    if (availability && availability.length > 0) {
      const inserts = availability.map(a => ({
        doctor_id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
        slot_duration_minutes: a.slot_duration_minutes || 30,
      }));
      await Availability.insertMany(inserts);
    }

    res.json({ message: 'Availability updated successfully' });
  } catch (err) {
    console.error('Save availability error:', err);
    res.status(500).json({ message: 'Server error updating availability' });
  }
});

module.exports = router;
