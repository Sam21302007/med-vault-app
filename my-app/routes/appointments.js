const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { protect } = require('./middleware');

const ensureAppointmentsExist = async (currentUserId, currentRole) => {
  try {
    const count = await Appointment.countDocuments();
    const doctors = await User.find({ role: 'doctor' });
    const patients = await User.find({ role: 'patient' });

    if (count === 0 && patients.length > 0 && doctors.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const sample = [
        { patient_id: patients[0]._id, doctor_id: doctors[0]._id, appointment_date: today, time_slot: '09:30 AM', status: 'confirmed', priority: 'urgent', reason: 'Hypertension consultation & ECG test', notes: 'Patient reports high morning blood pressure' },
        { patient_id: patients[1 % patients.length]._id, doctor_id: doctors[1 % doctors.length]._id, appointment_date: today, time_slot: '11:00 AM', status: 'confirmed', priority: 'normal', reason: 'Skin allergy rash treatment', notes: 'Pruritic rash on both arms' },
        { patient_id: patients[2 % patients.length]._id, doctor_id: doctors[2 % doctors.length]._id, appointment_date: today, time_slot: '02:30 PM', status: 'pending', priority: 'emergency', reason: 'Severe acute migraine headache', notes: 'Photophobia present' },
        { patient_id: patients[3 % patients.length]._id, doctor_id: doctors[3 % doctors.length]._id, appointment_date: today, time_slot: '04:00 PM', status: 'confirmed', priority: 'normal', reason: 'Knee joint pain & stiffness check', notes: 'Joint stiffness upon stair climbing' },
        { patient_id: patients[4 % patients.length]._id, doctor_id: doctors[4 % doctors.length]._id, appointment_date: tomorrow, time_slot: '10:15 AM', status: 'pending', priority: 'normal', reason: 'Routine sinus health checkup', notes: 'Nasal drip consultation' },
        { patient_id: patients[5 % patients.length]._id, doctor_id: doctors[5 % doctors.length]._id, appointment_date: tomorrow, time_slot: '01:30 PM', status: 'confirmed', priority: 'urgent', reason: 'Asthma breathing review', notes: 'Spirometry test review' },
      ];

      await Appointment.create(sample);
    }

    // If a patient is logged in and has 0 appointments, seed 2 appointments for them
    if (currentRole === 'patient' && currentUserId && doctors.length > 0) {
      const userApptCount = await Appointment.countDocuments({ patient_id: currentUserId });
      if (userApptCount === 0) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        await Appointment.create([
          {
            patient_id: currentUserId,
            doctor_id: doctors[0]._id,
            appointment_date: today,
            time_slot: '09:30 AM',
            status: 'confirmed',
            priority: 'urgent',
            reason: 'Cardiology Follow-up & ECG Test',
            notes: 'Regular checkup for hypertension management'
          },
          {
            patient_id: currentUserId,
            doctor_id: doctors[1 % doctors.length]._id,
            appointment_date: tomorrow,
            time_slot: '02:00 PM',
            status: 'pending',
            priority: 'normal',
            reason: 'General Consultation & Lab Results Review',
            notes: 'Discuss annual blood panel results'
          }
        ]);
      }
    }
  } catch (err) {
    console.error('ensureAppointmentsExist error:', err.message);
  }
};

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

    const populated = await Appointment.findById(appt._id)
      .populate('patient_id', 'full_name email phone gender date_of_birth')
      .populate('doctor_id', 'full_name email phone specialty');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ message: err.message || 'Server error booking appointment' });
  }
});

// @route   GET /api/appointments
// @desc    Get user appointments (Role-specific)
router.get('/', protect, async (req, res) => {
  try {
    await ensureAppointmentsExist(req.user._id, req.user.role);

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

    const mapped = appointments.map(a => {
      const obj = a.toObject();
      return {
        id: obj._id,
        _id: obj._id,
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
