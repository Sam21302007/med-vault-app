const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect } = require('./middleware');

// @route   POST /api/appointments
// @desc    Book a new appointment
router.post('/', protect, async (req, res) => {
  const { doctor_id, appointment_date, time_slot, reason, priority } = req.body;
  const patient_id = req.user._id;

  try {
    // 1. Conflict detection: Check if slot is already booked for this doctor
    const existing = await Appointment.findOne({
      doctor_id,
      appointment_date,
      time_slot,
      status: { $ne: 'cancelled' },
    });

    if (existing) {
      return res.status(400).json({ message: 'This time slot is already booked. Please choose another slot.' });
    }

    const appt = await Appointment.create({
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      reason,
      priority: priority || 'normal',
      status: 'pending',
    });

    res.status(201).json(appt);
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ message: err.message || 'Server error booking appointment' });
  }
});

// @route   GET /api/appointments
// @desc    Get user appointments (Role-specific)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      query.patient_id = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctor_id = req.user._id;
    }
    // Admin has no filters, sees all!

    const appointments = await Appointment.find(query)
      .populate('patient_id', 'full_name email phone gender date_of_birth')
      .populate('doctor_id', 'full_name email phone specialty')
      .sort({ appointment_date: -1, time_slot: 1 });

    // Transform fields to match the frontend expectations:
    // patient_id/doctor_id as objects key 'patient'/'doctor' containing details
    const mapped = appointments.map(a => {
      const obj = a.toObject();
      return {
        id: obj._id,
        patient_id: obj.patient_id?._id || obj.patient_id,
        doctor_id: obj.doctor_id?._id || obj.doctor_id,
        patient: obj.patient_id,
        doctor: obj.doctor_id,
        appointment_date: obj.appointment_date,
        time_slot: obj.time_slot,
        status: obj.status,
        priority: obj.priority,
        reason: obj.reason,
        notes: obj.notes,
        created_at: obj.created_at,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Fetch appointments error:', err);
    res.status(500).json({ message: 'Failed to retrieve appointments' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment status
router.put('/:id', protect, async (req, res) => {
  const { status, notes } = req.body;
  const apptId = req.params.id;

  try {
    let appt = await Appointment.findById(apptId);
    if (!appt) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization checks:
    // Patient can only cancel their own.
    // Doctor can update their own appts.
    // Admin can update anything.
    if (req.user.role === 'patient' && appt.patient_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'doctor' && appt.doctor_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (status) appt.status = status;
    if (notes !== undefined) appt.notes = notes;

    await appt.save();

    res.json({ message: 'Appointment updated successfully', appointment: appt });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ message: 'Server error updating appointment' });
  }
});

module.exports = router;
