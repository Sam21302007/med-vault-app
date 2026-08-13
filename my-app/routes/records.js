const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const { protect } = require('./middleware');

// @route   POST /api/records
// @desc    Add a medical record (Doctors only)
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: Doctors only' });
  }

  const { patient_id, appointment_id, diagnosis, prescription, notes } = req.body;
  const doctor_id = req.user._id;

  try {
    const record = await MedicalRecord.create({
      patient_id,
      doctor_id,
      appointment_id,
      diagnosis,
      prescription,
      notes,
    });

    // If an appointment ID is provided, automatically mark it as completed!
    if (appointment_id) {
      await Appointment.findByIdAndUpdate(appointment_id, { status: 'completed' });
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
    let query = {};
    if (req.user.role === 'patient') {
      query.patient_id = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctor_id = req.user._id;
    }
    // Admin sees all

    const records = await MedicalRecord.find(query)
      .populate('patient_id', 'full_name email gender date_of_birth')
      .populate('doctor_id', 'full_name email specialty')
      .sort({ created_at: -1 });

    // Transform fields to match the frontend expectations:
    // patient_id/doctor_id as objects key 'patient'/'doctor'
    const mapped = records.map(r => {
      const obj = r.toObject();
      return {
        id: obj._id,
        patient_id: obj.patient_id?._id || obj.patient_id,
        doctor_id: obj.doctor_id?._id || obj.doctor_id,
        appointment_id: obj.appointment_id,
        patient: obj.patient_id,
        doctor: obj.doctor_id,
        diagnosis: obj.diagnosis,
        prescription: obj.prescription,
        notes: obj.notes,
        created_at: obj.created_at,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Fetch records error:', err);
    res.status(500).json({ message: 'Failed to retrieve medical records' });
  }
});

module.exports = router;
