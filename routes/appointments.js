const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { protect } = require('./middleware');

const ensureAppointmentsExist = async (currentUserId, currentRole) => {
  try {
    const apptsSnap = await db.collection('appointments').get();
    const usersSnap = await db.collection('users').get();

    const doctors = [];
    const patients = [];
    usersSnap.forEach((doc) => {
      const u = { id: doc.id, _id: doc.id, ...doc.data() };
      if (u.role === 'doctor') doctors.push(u);
      if (u.role === 'patient') patients.push(u);
    });

    if (apptsSnap.empty && patients.length > 0 && doctors.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const samples = [
        { patient_id: patients[0]._id, doctor_id: doctors[0]._id, appointment_date: today, time_slot: '09:30 AM', status: 'confirmed', priority: 'urgent', reason: 'Hypertension consultation & ECG test', notes: 'Patient reports high morning blood pressure' },
        { patient_id: patients[1 % patients.length]._id, doctor_id: doctors[1 % doctors.length]._id, appointment_date: today, time_slot: '11:00 AM', status: 'confirmed', priority: 'normal', reason: 'Skin allergy rash treatment', notes: 'Pruritic rash on both arms' },
        { patient_id: patients[2 % patients.length]._id, doctor_id: doctors[2 % doctors.length]._id, appointment_date: today, time_slot: '02:30 PM', status: 'pending', priority: 'emergency', reason: 'Severe acute migraine headache', notes: 'Photophobia present' },
        { patient_id: patients[3 % patients.length]._id, doctor_id: doctors[3 % doctors.length]._id, appointment_date: today, time_slot: '04:00 PM', status: 'confirmed', priority: 'normal', reason: 'Knee joint pain & stiffness check', notes: 'Joint stiffness upon stair climbing' },
        { patient_id: patients[4 % patients.length]._id, doctor_id: doctors[4 % doctors.length]._id, appointment_date: tomorrow, time_slot: '10:15 AM', status: 'pending', priority: 'normal', reason: 'Routine sinus health checkup', notes: 'Nasal drip consultation' },
        { patient_id: patients[5 % patients.length]._id, doctor_id: doctors[5 % doctors.length]._id, appointment_date: tomorrow, time_slot: '01:30 PM', status: 'confirmed', priority: 'urgent', reason: 'Asthma breathing review', notes: 'Spirometry test review' },
      ];

      for (const item of samples) {
        const id = 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        await db.collection('appointments').doc(id).set({ id, _id: id, ...item, created_at: new Date().toISOString() });
      }
    }

    if (currentRole === 'patient' && currentUserId && doctors.length > 0) {
      const userApptSnap = await db.collection('appointments').where('patient_id', '==', currentUserId).get();
      if (userApptSnap.empty) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const userSamples = [
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
        ];

        for (const item of userSamples) {
          const id = 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          await db.collection('appointments').doc(id).set({ id, _id: id, ...item, created_at: new Date().toISOString() });
        }
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
  const patient_id = req.user._id || req.user.id;

  try {
    const existingSnap = await db.collection('appointments')
      .where('doctor_id', '==', doctor_id)
      .where('appointment_date', '==', appointment_date)
      .where('time_slot', '==', time_slot)
      .get();

    let conflict = false;
    existingSnap.forEach((doc) => {
      if (doc.data().status !== 'cancelled') conflict = true;
    });

    if (conflict) {
      return res.status(400).json({ message: 'This time slot is already booked. Please choose another slot.' });
    }

    const apptId = 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newAppt = {
      id: apptId,
      _id: apptId,
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      reason,
      priority: priority || 'normal',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await db.collection('appointments').doc(apptId).set(newAppt);

    const patDoc = await db.collection('users').doc(patient_id).get();
    const docDoc = await db.collection('users').doc(doctor_id).get();

    newAppt.patient = patDoc.exists ? patDoc.data() : { _id: patient_id, full_name: 'Patient' };
    newAppt.doctor = docDoc.exists ? docDoc.data() : { _id: doctor_id, full_name: 'Doctor' };

    res.status(201).json(newAppt);
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ message: err.message || 'Server error booking appointment' });
  }
});

// @route   GET /api/appointments
// @desc    Get user appointments (Role-specific)
router.get('/', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    await ensureAppointmentsExist(currentUserId, req.user.role);

    let snap;
    if (req.user.role === 'patient') {
      snap = await db.collection('appointments').where('patient_id', '==', currentUserId).get();
    } else if (req.user.role === 'doctor') {
      snap = await db.collection('appointments').where('doctor_id', '==', currentUserId).get();
    } else {
      snap = await db.collection('appointments').get();
    }

    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.forEach((uDoc) => userMap.set(uDoc.id, { _id: uDoc.id, id: uDoc.id, ...uDoc.data() }));

    const list = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const patient = userMap.get(data.patient_id) || { _id: data.patient_id, full_name: 'Patient User' };
      const doctor = userMap.get(data.doctor_id) || { _id: data.doctor_id, full_name: 'Dr. Specialist', specialty: 'General' };

      list.push({
        id,
        _id: id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        patient,
        doctor,
        appointment_date: data.appointment_date,
        time_slot: data.time_slot,
        status: data.status,
        priority: data.priority,
        reason: data.reason,
        notes: data.notes,
        created_at: data.created_at,
      });
    });

    res.json(list);
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
    const docRef = db.collection('appointments').doc(apptId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const apptData = docSnap.data();
    const currentUserId = req.user._id || req.user.id;

    if (req.user.role === 'patient' && apptData.patient_id !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'doctor' && apptData.doctor_id !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await docRef.update(updates);
    const updatedSnap = await docRef.get();

    res.json({ message: 'Appointment updated successfully', appointment: { id: apptId, _id: apptId, ...updatedSnap.data() } });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ message: 'Server error updating appointment' });
  }
});

module.exports = router;
