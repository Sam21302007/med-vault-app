const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { protect } = require('./middleware');

// @route   GET /api/availability/:doctorId
// @desc    Get a doctor's availability
router.get('/:doctorId', protect, async (req, res) => {
  try {
    const snap = await db.collection('availability').where('doctor_id', '==', req.params.doctorId).get();
    const list = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, _id: doc.id, ...doc.data() });
    });
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

  const { availability } = req.body;
  const doctor_id = req.user._id || req.user.id;

  try {
    const snap = await db.collection('availability').where('doctor_id', '==', doctor_id).get();
    snap.forEach(async (doc) => {
      await db.collection('availability').doc(doc.id).delete().catch(() => {});
    });

    if (availability && availability.length > 0) {
      for (const a of availability) {
        const id = 'avail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        await db.collection('availability').doc(id).set({
          id,
          _id: id,
          doctor_id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
          slot_duration_minutes: a.slot_duration_minutes || 30,
        });
      }
    }

    res.json({ message: 'Availability updated successfully' });
  } catch (err) {
    console.error('Save availability error:', err);
    res.status(500).json({ message: 'Server error updating availability' });
  }
});

module.exports = router;
