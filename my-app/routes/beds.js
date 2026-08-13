const express = require('express');
const router = express.Router();
const Bed = require('../models/Bed');
const AuditLog = require('../models/AuditLog');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/beds - Get all beds & stats summary
router.get('/', async (req, res) => {
  try {
    const beds = await Bed.find().populate('patient_id', 'full_name email phone').sort({ bed_number: 1 });
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
    const bed = await Bed.create({ bed_number, ward, room_number, daily_rate, notes });
    
    await AuditLog.create({
      action: 'BED_CREATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Created new bed ${bed_number} in ward ${ward}`,
      category: 'BED'
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
    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    if (status !== undefined) bed.status = status;
    if (notes !== undefined) bed.notes = notes;
    if (patient_id !== undefined) {
      bed.patient_id = patient_id || null;
      bed.admitted_at = patient_id ? new Date() : null;
    }

    await bed.save();
    const updatedBed = await Bed.findById(bed._id).populate('patient_id', 'full_name email phone');

    await AuditLog.create({
      action: 'BED_STATUS_UPDATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Updated bed ${bed.bed_number} status to ${bed.status}`,
      category: 'BED'
    });

    res.json(updatedBed);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
