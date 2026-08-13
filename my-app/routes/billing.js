const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const AuditLog = require('../models/AuditLog');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/billing - Get invoices (filtered by patient or user role)
router.get('/', async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    let query = {};
    if (patient_id) query.patient_id = patient_id;
    if (status) query.payment_status = status;

    const invoices = await Billing.find(query)
      .populate('patient_id', 'full_name email phone')
      .populate('doctor_id', 'full_name specialty')
      .sort({ createdAt: -1 });

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

    const invoice = await Billing.create({
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
    });

    const populated = await Billing.findById(invoice._id)
      .populate('patient_id', 'full_name email phone')
      .populate('doctor_id', 'full_name specialty');

    await AuditLog.create({
      action: 'INVOICE_CREATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Generated invoice ${invoice_number} for total ₹${total_amount}`,
      category: 'BILLING'
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/billing/:id/pay - Record invoice payment
router.patch('/:id/pay', verifyToken, async (req, res) => {
  try {
    const { payment_method = 'Card' } = req.body;
    const invoice = await Billing.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.payment_status = 'Paid';
    invoice.payment_method = payment_method;
    invoice.paid_at = new Date();
    await invoice.save();

    const updated = await Billing.findById(invoice._id)
      .populate('patient_id', 'full_name email phone')
      .populate('doctor_id', 'full_name specialty');

    await AuditLog.create({
      action: 'INVOICE_PAID',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Paid invoice ${invoice.invoice_number} via ${payment_method} (₹${invoice.total_amount})`,
      category: 'BILLING'
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
