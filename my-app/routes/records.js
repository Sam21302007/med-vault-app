const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { protect } = require('./middleware');

// @route   POST /api/records
// @desc    Add a medical record (Doctors only)
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: Doctors only' });
  }

  const { patient_id, appointment_id, diagnosis, prescription, notes } = req.body;
  const doctor_id = req.user._id || req.user.id;

  try {
    const recId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const record = {
      id: recId,
      _id: recId,
      patient_id,
      doctor_id,
      appointment_id: appointment_id || null,
      diagnosis: diagnosis || '',
      prescription: prescription || '',
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    await db.collection('records').doc(recId).set(record);

    if (appointment_id) {
      await db.collection('appointments').doc(appointment_id).update({ status: 'completed' }).catch(() => {});
    }

    res.status(201).json(record);
  } catch (err) {
    console.error('Create medical record error:', err);
    res.status(500).json({ message: err.message || 'Server error creating medical record' });
  }
});

// @route   GET /api/records
// @desc    Get medical records (Role-based filtering)
router.get('/', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    let snap;
    if (req.user.role === 'patient') {
      snap = await db.collection('records').where('patient_id', '==', currentUserId).get();
    } else if (req.user.role === 'doctor') {
      snap = await db.collection('records').where('doctor_id', '==', currentUserId).get();
    } else {
      snap = await db.collection('records').get();
    }

    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.forEach((u) => userMap.set(u.id, u.data()));

    const list = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const patient = userMap.get(data.patient_id) || { _id: data.patient_id, full_name: 'Patient' };
      const doctor = userMap.get(data.doctor_id) || { _id: data.doctor_id, full_name: 'Doctor' };

      list.push({
        id,
        _id: id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_id: data.appointment_id,
        patient,
        doctor,
        diagnosis: data.diagnosis,
        prescription: data.prescription,
        notes: data.notes,
        created_at: data.created_at,
      });
    });

    res.json(list);
  } catch (err) {
    console.error('Fetch records error:', err);
    res.status(500).json({ message: 'Failed to retrieve medical records' });
  }
});

module.exports = router;
