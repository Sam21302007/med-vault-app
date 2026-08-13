const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy');
const AuditLog = require('../models/AuditLog');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/pharmacy - Get inventory list & stock statistics
router.get('/', async (req, res) => {
  try {
    const items = await Pharmacy.find().sort({ name: 1 });
    const lowStockCount = items.filter(i => i.stock_quantity <= i.reorder_level).length;
    const totalItems = items.length;

    res.json({
      items,
      stats: {
        total_medicines: totalItems,
        low_stock_alerts: lowStockCount,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/pharmacy - Add new drug/medicine
router.post('/', verifyToken, verifyRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { name, generic_name, category, stock_quantity, reorder_level, unit_price, expiry_date, manufacturer, location } = req.body;
    const medicine = await Pharmacy.create({
      name,
      generic_name: generic_name || '',
      category,
      stock_quantity: Number(stock_quantity) || 0,
      reorder_level: Number(reorder_level) || 20,
      unit_price: Number(unit_price) || 0,
      expiry_date: expiry_date ? new Date(expiry_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      manufacturer: manufacturer || 'MedVault Pharma',
      location: location || 'Shelf A-1',
    });

    await AuditLog.create({
      action: 'MEDICINE_ADDED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Added new medicine ${name} (Stock: ${stock_quantity})`,
      category: 'PHARMACY'
    });

    res.status(201).json(medicine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/pharmacy/:id/stock - Restock or adjust inventory quantity
router.put('/:id/stock', verifyToken, verifyRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { quantity_change } = req.body;
    const medicine = await Pharmacy.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });

    medicine.stock_quantity = Math.max(0, medicine.stock_quantity + (Number(quantity_change) || 0));
    await medicine.save();

    await AuditLog.create({
      action: 'STOCK_UPDATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Adjusted stock for ${medicine.name} by ${quantity_change} (New total: ${medicine.stock_quantity})`,
      category: 'PHARMACY'
    });

    res.json(medicine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
