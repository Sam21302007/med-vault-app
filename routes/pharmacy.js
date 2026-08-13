const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/pharmacy - Get inventory list & stock statistics
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('pharmacy').get();
    const items = [];
    snap.forEach((doc) => {
      items.push({ id: doc.id, _id: doc.id, ...doc.data() });
    });

    const lowStockCount = items.filter(i => (i.stock_quantity || 0) <= (i.reorder_level || 20)).length;
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
    const medId = 'med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const medicine = {
      id: medId,
      _id: medId,
      name,
      generic_name: generic_name || '',
      category: category || 'General',
      stock_quantity: Number(stock_quantity) || 0,
      reorder_level: Number(reorder_level) || 20,
      unit_price: Number(unit_price) || 0,
      expiry_date: expiry_date || new Date(Date.now() + 365 * 86400000).toISOString(),
      manufacturer: manufacturer || 'MedVault Pharma',
      location: location || 'Shelf A-1',
      created_at: new Date().toISOString(),
    };

    await db.collection('pharmacy').doc(medId).set(medicine);

    await db.collection('audit_logs').add({
      action: 'MEDICINE_ADDED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Added new medicine ${name} (Stock: ${stock_quantity})`,
      category: 'PHARMACY',
      timestamp: new Date().toISOString()
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
    const medRef = db.collection('pharmacy').doc(req.params.id);
    const medSnap = await medRef.get();

    if (!medSnap.exists) return res.status(404).json({ message: 'Medicine not found' });

    const medData = medSnap.data();
    const newQty = Math.max(0, (medData.stock_quantity || 0) + (Number(quantity_change) || 0));

    await medRef.update({ stock_quantity: newQty });
    const updated = { id: req.params.id, _id: req.params.id, ...medData, stock_quantity: newQty };

    await db.collection('audit_logs').add({
      action: 'STOCK_UPDATED',
      user_name: req.user.full_name || req.user.email,
      user_role: req.user.role,
      details: `Adjusted stock for ${medData.name} by ${quantity_change} (New total: ${newQty})`,
      category: 'PHARMACY',
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
