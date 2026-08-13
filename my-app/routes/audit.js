const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/audit - Get recent audit logs (Admin only)
router.get('/', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const snap = await db.collection('audit_logs').limit(100).get();
    const logs = [];
    snap.forEach((doc) => {
      logs.push({ id: doc.id, _id: doc.id, ...doc.data() });
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
