const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/billing - Get invoices (filtered by patient or user role)
router.get('/', async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    const snap = await db.collection('billing').get();
    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.forEach((u) => userMap.set(u.id, u.data()));

    let invoices = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const patient = data.patient_id ? userMap.get(data.patient_id) : null;
      const doctor = data.doctor_id ? userMap.get(data.doctor_id) : null;

      invoices.push({ id, _id: id, ...data, patient_id: patient, doctor_id: doctor });
    });

    if (patient_id) invoices = invoices.filter(i => (i.patient_id?.id || i.patient_id?._id || i.patient_id) === patient_id);
    if (status) invoices = invoices.filter(i => i.payment_status === status);

    const totalRevenue = invoices
      .filter(i => i.payment_status === 'Paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const pendingAmount = invoices
      .filter(i => i.payment_status === 'Pending')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);

    res.json({
      invoices,
      stats: {
        total_invoices: invoices.length,
        total_revenue: totalRevenue,
        pending_amount: pendingAmount,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/billing - Create new invoice
router.post('/', verifyToken, verifyRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { patient_id, doctor_id, items, tax = 0, discount = 0, notes } = req.body;
    
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Invoice must contain at least one line item' });
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const total_amount = Math.max(0, subtotal + Number(tax) - Number(discount));
    const invoice_number = `INV-${Date.now().toString().slice(-6)}`;
    const invId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const invoice = {
      id: invId,
      _id: invId,
      invoice_number,
      patient_id,
      doctor_id: doctor_id || null,
      items,
      subtotal,
      tax,
      discount,
      total_amount,
      payment_status: 'Pending',
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    await db.collection('billing').doc(invId).set(invoice);

    await db.collection('audit_logs').add({
      action: 'INVOICE_CREATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Generated invoice ${invoice_number} for total ₹${total_amount}`,
      category: 'BILLING',
      timestamp: new Date().toISOString()
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/billing/:id/pay - Record invoice payment
router.patch('/:id/pay', verifyToken, async (req, res) => {
  try {
    const { payment_method = 'Card' } = req.body;
    const invRef = db.collection('billing').doc(req.params.id);
    const invSnap = await invRef.get();
    if (!invSnap.exists) return res.status(404).json({ message: 'Invoice not found' });

    const invData = invSnap.data();
    const updates = {
      payment_status: 'Paid',
      payment_method,
      paid_at: new Date().toISOString(),
    };

    await invRef.update(updates);
    const updated = { id: req.params.id, _id: req.params.id, ...invData, ...updates };

    await db.collection('audit_logs').add({
      action: 'INVOICE_PAID',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Paid invoice ${invData.invoice_number} via ${payment_method} (₹${invData.total_amount})`,
      category: 'BILLING',
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
