const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/beds - Get all beds & stats summary
router.get('/', async (req, res) => {
  try {
    const bedsSnap = await db.collection('beds').get();
    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.forEach((u) => userMap.set(u.id, u.data()));

    const beds = [];
    bedsSnap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const patient = data.patient_id ? userMap.get(data.patient_id) : null;
      beds.push({ id, _id: id, ...data, patient_id: patient });
    });

    const total = beds.length;
    const occupied = beds.filter(b => b.status === 'Occupied').length;
    const available = beds.filter(b => b.status === 'Available').length;
    const cleaning = beds.filter(b => b.status === 'Cleaning' || b.status === 'Maintenance').length;

    res.json({
      beds,
      stats: { total, occupied, available, cleaning, occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0 }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/beds - Add new bed
router.post('/', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { bed_number, ward, room_number, daily_rate, notes } = req.body;
    const bedId = 'bed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const bed = { id: bedId, _id: bedId, bed_number, ward, room_number, daily_rate: daily_rate || 500, status: 'Available', notes: notes || '' };
    
    await db.collection('beds').doc(bedId).set(bed);

    await db.collection('audit_logs').add({
      action: 'BED_CREATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Created new bed ${bed_number} in ward ${ward}`,
      category: 'BED',
      timestamp: new Date().toISOString()
    });

    res.status(201).json(bed);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/beds/:id - Update bed status / assign patient
router.put('/:id', verifyToken, verifyRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { status, patient_id, notes } = req.body;
    const bedRef = db.collection('beds').doc(req.params.id);
    const bedSnap = await bedRef.get();

    if (!bedSnap.exists) return res.status(404).json({ message: 'Bed not found' });

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (patient_id !== undefined) {
      updates.patient_id = patient_id || null;
      updates.admitted_at = patient_id ? new Date().toISOString() : null;
    }

    await bedRef.update(updates);
    const updatedSnap = await bedRef.get();
    const updatedData = updatedSnap.data();

    await db.collection('audit_logs').add({
      action: 'BED_STATUS_UPDATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Updated bed ${updatedData.bed_number} status to ${updatedData.status}`,
      category: 'BED',
      timestamp: new Date().toISOString()
    });

    res.json({ id: req.params.id, _id: req.params.id, ...updatedData });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
